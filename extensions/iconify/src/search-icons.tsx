import { Color, Grid, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

import { toDataURI, toSvg } from "./utils";
import { iconColorEnum } from "./types";
import { useQueryIcons } from "./hooks/use-query-icons";
import { IconActions } from "./components/IconActions";
import { ErrorGuard } from "./components/ErrorGuard";

const { iconColor, customColor } = getPreferenceValues<Preferences>();

function Command() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useQueryIcons(query);

  function getEmptyViewDescription(query: string, isLoading: boolean) {
    if (query.length === 0 || isLoading) {
      return "Type something to get started";
    }
    return "Try another query";
  }

  return (
    <ErrorGuard error={error}>
      <Grid throttle columns={8} inset={Grid.Inset.Medium} isLoading={isLoading} onSearchTextChange={setQuery}>
        <Grid.EmptyView title="No results" description={getEmptyViewDescription(query, isLoading)} />
        {data.map((icon) => {
          const { set, id, body, width, height } = icon;
          const { id: setId, title: setName } = set;
          const svgIcon = toSvg(
            body,
            width,
            height,
            iconColor === iconColorEnum.customColor &&
              customColor &&
              /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(customColor)
              ? customColor
              : iconColor,
          );
          const dataURIIcon = toDataURI(svgIcon);
          return (
            <Grid.Item
              content={{
                source: dataURIIcon,
                tintColor: body.includes("currentColor")
                  ? Color.PrimaryText // Monochrome icon
                  : null,
              }}
              key={`${setId}:${id}`}
              title={id}
              subtitle={setName}
              actions={<IconActions id={id} setId={setId} svgIcon={svgIcon} dataURIIcon={dataURIIcon} />}
            />
          );
        })}
      </Grid>
    </ErrorGuard>
  );
}

export default Command;
