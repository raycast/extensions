import { Color, Icon, Image, List } from "@raycast/api";
import { Standing } from "../types";

export default function StandingV3(props: {
  standing: Standing[] | undefined;
}) {
  return props.standing?.map((team) => {
    const accessory: List.Item.Accessory = {
      text: "",
    };

    let title = "";
    const results: List.Item.Detail.Metadata.Label.Props[] = [];
    const scoring: List.Item.Detail.Metadata.Label.Props[] = [];
    const forms: List.Item.Detail.Metadata.TagList.Item.Props[] = [];

    team.stats.forEach((stat) => {
      switch (stat.statsId) {
        case "rank":
          title = String(stat.statsValue);
          break;
        // case "team":
        //   break
        case "points":
          accessory.text = {
            color: Color.PrimaryText,
            value: String(stat.statsValue),
          };
          accessory.tooltip = stat.statsLabel;
          break;
        case "matches-played":
        case "win":
        case "draw":
        case "lose":
          results.push({
            title: stat.statsLabel,
            text: String(stat.statsValue),
          });
          break;
        case "goals-for":
        case "goals-against":
        case "goal-difference":
          scoring.push({
            title: stat.statsLabel,
            text: String(stat.statsValue),
          });
          break;
        case "movement":
          {
            let icon: Image.ImageLike = Icon.Dot;

            if (stat.statsValue === "down") {
              icon = {
                source: Icon.ChevronDownSmall,
                tintColor: Color.Red,
              };
            }

            if (stat.statsValue === "up") {
              icon = {
                source: Icon.ChevronUpSmall,
                tintColor: Color.Green,
              };
            }

            accessory.icon = icon;
          }

          break;
        case "form":
          if (Array.isArray(stat.statsValue)) {
            stat.statsValue.forEach((val) => {
              let color = Color.SecondaryText;
              if (val.formLabelAbbreviation === "D") color = Color.Green;
              if (val.formLabelAbbreviation === "L") color = Color.Red;

              forms.push({
                text: val.formLabelAbbreviation,
                color,
              });
            });
          }

          break;
        default:
          break;
      }
    });

    return (
      <List.Item
        key={team.team_id}
        icon={{
          source: {
            light: team.team_image,
            dark: team.team_image_secondary,
          },
        }}
        title={title}
        subtitle={team.mediaName}
        keywords={[
          team.mediaName,
          team.shortName,
          team.mediaShortName,
          team.mediaName,
          team.officialName,
        ]}
        accessories={[accessory]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {results.map((result, idx) => {
                  return (
                    <List.Item.Detail.Metadata.Label
                      key={idx}
                      title={result.title}
                      text={result.text}
                    />
                  );
                })}
                <List.Item.Detail.Metadata.Separator />
                {scoring.map((score, idx) => {
                  return (
                    <List.Item.Detail.Metadata.Label
                      key={idx}
                      title={score.title}
                      text={score.text}
                    />
                  );
                })}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.TagList title="Form">
                  {forms.map((form, idx) => {
                    return (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={idx}
                        text={form.text}
                        color={form.color}
                      />
                    );
                  })}
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  });
}
