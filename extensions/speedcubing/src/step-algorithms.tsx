import { Action, ActionPanel, Detail, Grid, Icon } from "@raycast/api";
import { Step } from "./data";
import Notation from "./notation";

type StepAlgorithmsProps = {
  stepAlgorithmsList: Step[];
};

export default function StepAlgorithms({ stepAlgorithmsList }: StepAlgorithmsProps) {
  return (
    <Grid inset={Grid.Inset.Small} columns={4}>
      {stepAlgorithmsList.map(({ title, cases }) => (
        <Grid.Section title={title} key={title} subtitle={`${cases.length} Cases`}>
          {cases.map((c) => {
            const markdown = `
&nbsp;

<img src="cases/${c.id}.png" width="100" />

# ${c.name}

#### Algorithm
\`\`\`
${c.algs[0].moves}
\`\`\`
\n\n${c.algs[0].description || ""}

${
  c.algs.length > 1
    ? `#### Alternative Algorithms
${c.algs
  .filter((a, i) => i > 0)
  .map((a) => `\`\`\`\n ${a.moves}\n\`\`\``)
  .join("\n")}`
    : ""
}`;
            const Actions = () => {
              return (
                <>
                  <Action.CopyToClipboard content={c.algs[0].moves} title="Copy Algorithm" />
                  <Action.Push
                    title="View Notation"
                    target={<Notation />}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </>
              );
            };
            return (
              <Grid.Item
                key={c.name}
                title={c.algs[0].moves}
                content={`cases/${c.id}.png`}
                keywords={[c.name]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Case"
                      target={
                        <Detail
                          markdown={markdown}
                          actions={
                            <ActionPanel>
                              <Actions />
                            </ActionPanel>
                          }
                        />
                      }
                      icon={Icon.Eye}
                    />
                    <Actions />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}
