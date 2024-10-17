import { Color, Detail } from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import api from "../api";
import moment from "moment-timezone";

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

export default function OncallViewPage({ oncallId }: { oncallId: string }) {
  const [spectrum, setSpectrum] = useState<Shift[]>([]);
  const [oncall, setOncall] = useState<Oncall | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [nextOncallUser, setNextOncallUser] = useState<User | null>(null);

  const shiftsDividedByDay = useMemo(() => {
    return spectrum.reduce((acc: Record<string, Shift[]>, shift) => {
      const day = moment(shift.start).format("dddd, Do MMMM");
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(shift);
      return acc;
    }, {});
  }, [spectrum]);

  function createMarkdown(): string {
    return `
# ${spectrum && spectrum.length > 0 ? spectrum[0].oncallName : "Oncall Schedule"}

${Object.entries(shiftsDividedByDay)
  .map(
    ([day, shifts]) => `
### ${day}
${shifts.map(createLayerMarkdown).join("\n")}
---
`,
  )
  .join("\n")}
    `.trim();
  }

  function createLayerMarkdown(shift: Shift): string {
    return `\`${moment(shift.start).format("h:mm A")}\` - \`${moment(shift.end).format("h:mm A")}\`  ${shift.title} \n`;
  }

  useEffect(() => {
    async function fetchOncall() {
      try {
        const response = await api.oncall.getOncallSpectrum(oncallId, {
          start: moment().toISOString(),
          end: moment().add(14, "days").toISOString(),
        });

        const oncallResponse = await api.oncall.getOncall(oncallId);
        const nextOncallResponse = await api.oncall.getWhoIsOncallNext(oncallId);

        setNextOncallUser(nextOncallResponse.nextShift);
        setActiveShift(oncallResponse.activeShift);
        setOncall(oncallResponse.oncall);
        setSpectrum(response.spectrum);
      } catch (error) {
        console.error("Error fetching oncall spectrum:", error);
      }
    }

    fetchOncall();
  }, [oncallId]);

  const metadata = useMemo(() => {
    if (!activeShift) return null;
    return (
      <Detail.Metadata>
        <Detail.Metadata.TagList title="Current on-call">
          <Detail.Metadata.TagList.Item
            color={Color.Green}
            text={`${activeShift.user.firstName} ${activeShift.user.lastName}`}
          />
        </Detail.Metadata.TagList>
        {nextOncallUser && (
          <Detail.Metadata.Label title="Next on-call" text={`${nextOncallUser.firstName} ${nextOncallUser.lastName}`} />
        )}
        <Detail.Metadata.Label
          title="Members"
          text={`${oncall?.users.length ?? 0} ${oncall?.users.length === 1 ? "member" : "members"}`}
        />
        <Detail.Metadata.Label
          title="Layers"
          text={`${oncall?.layers.length ?? 0} ${oncall?.layers.length === 1 ? "layer" : "layers"}`}
        />
      </Detail.Metadata>
    );
  }, [activeShift, oncall]);

  return (
    <Detail navigationTitle={`${oncall ? oncall.name : "Oncall"}`} markdown={createMarkdown()} metadata={metadata} />
  );
}
