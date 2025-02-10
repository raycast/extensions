import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import api from "../api";
import moment from "moment-timezone";
import config from "../config";

interface Shift {
  oncallName: string;
  id: string;
  title: string;
  start: string;
  end: string;
}

interface Oncall {
  _id: string;
  name: string;
  users: object[];
  layers: object[];
}

interface ActiveShift {
  user: User;
}

interface User {
  firstName: string;
  lastName: string;
  _id: string;
  email: string;
}

interface FetchedData {
  spectrum: Shift[];
  oncall: Oncall;
  activeShift: ActiveShift;
  nextOncallUser: User;
}

export default function OncallViewPage({ oncallId }: { oncallId: string }) {
  const fetchOncallData = async (id: string): Promise<FetchedData> => {
    const [spectrumResponse, oncallResponse, nextOncallResponse] = await Promise.all([
      api.oncall.getOncallSpectrum(id, {
        start: moment().toISOString(),
        end: moment().add(14, "days").toISOString(),
      }),
      api.oncall.getOncall(id),
      api.oncall.getWhoIsOncallNext(id),
    ]);

    return {
      spectrum: spectrumResponse.spectrum,
      oncall: oncallResponse.oncall,
      activeShift: oncallResponse.activeShift,
      nextOncallUser: nextOncallResponse.nextShift,
    };
  };

  const { data, isLoading } = useCachedPromise<typeof fetchOncallData, [string]>(fetchOncallData, [oncallId]);

  const shiftsDividedByDay = useMemo(() => {
    if (!data) return {};

    return data.spectrum.reduce((acc: Record<string, Shift[]>, shift: Shift) => {
      const day = moment(shift.start).format("dddd, Do MMMM");
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(shift);
      return acc;
    }, {});
  }, [data]);

  function createMarkdown(): string {
    if (!data) return "";

    return `
# ${data.spectrum.length > 0 ? data.spectrum[0].oncallName : "Oncall Schedule"}

${Object.entries(shiftsDividedByDay)
  .map(
    ([day, shifts]) => `
### ${day}
${(shifts as Shift[]).map(createLayerMarkdown).join("\n")}
---
`,
  )
  .join("\n")}
    `.trim();
  }

  function createLayerMarkdown(shift: Shift): string {
    return `\`${moment(shift.start).format("h:mm A")}\` - \`${moment(shift.end).format("h:mm A")}\`  ${shift.title} \n`;
  }

  const metadata = useMemo(() => {
    if (!data?.activeShift) return null;

    return (
      <Detail.Metadata>
        <Detail.Metadata.TagList title="Current on-call">
          <Detail.Metadata.TagList.Item
            color={Color.Green}
            text={`${data.activeShift.user.firstName} ${data.activeShift.user.lastName}`}
          />
        </Detail.Metadata.TagList>
        {data.nextOncallUser && (
          <Detail.Metadata.Label
            title="Next on-call"
            text={`${data.nextOncallUser.firstName} ${data.nextOncallUser.lastName}`}
          />
        )}
        <Detail.Metadata.Label
          title="Members"
          text={`${data.oncall?.users.length ?? 0} ${data.oncall?.users.length === 1 ? "member" : "members"}`}
        />
        <Detail.Metadata.Label
          title="Layers"
          text={`${data.oncall?.layers.length ?? 0} ${data.oncall?.layers.length === 1 ? "layer" : "layers"}`}
        />
      </Detail.Metadata>
    );
  }, [data]);

  return (
    <Detail
      navigationTitle={`${data?.oncall ? data.oncall.name : "Oncall"}`}
      markdown={createMarkdown()}
      metadata={metadata}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Open icon={Icon.Globe} title="Open in Spike" target={`${config!.spike}/on-calls/${oncallId}`} />
        </ActionPanel>
      }
    />
  );
}
