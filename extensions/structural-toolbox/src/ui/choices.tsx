import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Choice, choiceID } from "../core/smart-choices";
import { Library } from "../core/library";
import { parseSection } from "../core/input";
import { sectionDrawing } from "./drawings";
import { fmt } from "./state";
import { Section, Material } from "../core/types";
export function choiceRows(
  choices: Choice[],
  current: string,
  choose: (c: Choice) => void,
  library: Library,
  options: {
    currentFirst?: boolean;
    preview?: (section?: Section, material?: Material) => string;
    compactDetails?: boolean;
  } = {},
) {
  return [...new Set(choices.map((c) => c.group))].map((group) => (
    <List.Section key={group} title={group}>
      {choices
        .filter((c) => c.group === group)
        .map((c) => {
          const section =
              library.sections.find((s) => s.id === c.value) ||
              (() => {
                try {
                  return parseSection(c.value, library);
                } catch {
                  return undefined;
                }
              })(),
            material = library.materials.find((m) => m.id === c.value);
          const details = section
            ? `**${c.title}**\n\n![Section](${sectionDrawing(section)})\n\nArea ${fmt(section.A)} mm²; Iy ${fmt(section.Iy)} mm⁴.\n\n${c.explanation || ""}\n\nEnter to select this section. You can also type your own size.`
            : material
              ? `**${c.title}**\n\nE = ${material.E} MPa; G = ${material.G ?? "enter custom G"} MPa.\n\n${material.source}\n\nEnter to select.\n\n` +
                (options.currentFirst ? "" : current)
              : current;
          const md = options.currentFirst
            ? (options.preview?.(section || undefined, material) || current) +
              (section || material
                ? options.compactDetails
                  ? "\n\n**Enter to use " + c.title + ".**"
                  : "\n\n**Suggested choice**\n\n" + details
                : "")
            : details;
          return (
            <List.Item
              key={c.group + c.value}
              id={choiceID(c)}
              title={c.title}
              subtitle={c.hint}
              icon={section ? Icon.Box : material ? Icon.Layers : Icon.ArrowRight}
              detail={<List.Item.Detail markdown={md} />}
              actions={
                <ActionPanel>
                  <Action title={"Use " + c.title} onAction={() => choose(c)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List.Section>
  ));
}
