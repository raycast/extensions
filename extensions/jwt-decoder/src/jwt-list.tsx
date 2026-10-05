import { List } from "@raycast/api";
import { useState } from "react";
import { renderTokenSvgToString } from "./components/token-svg";
import { JwtListItem } from "./components/jwt-list-item";
import { usePreferences } from "raycast-hooks";
import { DecodedJwtGate } from "./components/decoded-jwt-gate";
import useDecodedJwt from "./utils/use-decoded-jwt";

interface selectedState {
  type: string;
  value: string;
}

const JwtView = () => {
  const decoded = useDecodedJwt();
  const [{ showDetail }, { update }] = usePreferences({ showDetail: false });
  const [selected, setSelected] = useState<selectedState>();

  return (
    <DecodedJwtGate decoded={decoded}>
      {({ ready, clipboard, header, data, headerItems, dataItems }) => {
        const section = selected?.type;
        const definition = (selected?.type === "head" ? headerItems : dataItems).find(
          (item) => item.key === selected?.value,
        );

        const markdown = showDetail
          ? (() => {
              try {
                return [
                  `<img alt="view token" width="400" src="data:image/svg+xml,${encodeURIComponent(
                    renderTokenSvgToString({
                      clipboard,
                      showToken: true,
                      showDetail: false,
                      section,
                      definition,
                    }),
                  )}" />`,
                ];
              } catch (e) {
                return [
                  `# Please copy a valid JWT to your clipboard\n\nERROR:\n> ${
                    e instanceof Error ? e.message : String(e)
                  }\n\n\`\`\`\n${clipboard}\n\`\`\``,
                ];
              }
            })()
          : [];

        const detail = !!showDetail && <List.Item.Detail markdown={markdown.join("\n\n")} />;

        const selectionChange = (id?: string | null) => {
          const parts = id ? id.split(".") : [];
          setSelected({ type: parts[0] ?? "", value: parts[1] ?? "" });
        };

        return (
          <List isLoading={!ready} isShowingDetail={!!showDetail} onSelectionChange={selectionChange}>
            <List.Section title="HEAD: ALGORITHM & TOKEN TYPE">
              {headerItems.map((item) => (
                <JwtListItem
                  key={item.key}
                  type="head"
                  {...{
                    item,
                    detail,
                    data,
                    header,
                  }}
                  showDetail={!!showDetail}
                  toggleShowDetail={() => update("showDetail", !showDetail)}
                />
              ))}
            </List.Section>
            <List.Section title="PAYLOAD: DATA">
              {dataItems.map((item) => (
                <JwtListItem
                  key={item.key}
                  type="data"
                  {...{
                    item,
                    detail,
                    data,
                    header,
                  }}
                  showDetail={!!showDetail}
                  toggleShowDetail={() => update("showDetail", !showDetail)}
                />
              ))}
            </List.Section>
          </List>
        );
      }}
    </DecodedJwtGate>
  );
};

export default JwtView;
