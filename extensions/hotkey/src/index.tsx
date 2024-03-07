import { ActionPanel, List, Action } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        icon="figma.png"
        title="figma"
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              target={
                <List>
                  <List.Item title="O" icon="figma-o.png" accessories={[{ text: "circle" }]} />
                  <List.Item title="R" icon="figma-r.png" accessories={[{ text: "rectangle" }]} />
                  <List.Item title="L" icon="figma-l.png" accessories={[{ text: "line" }]} />
                  <List.Item title="f" icon="figma-f.png" accessories={[{ text: "frame" }]} />
                </List>
              }
            />
          </ActionPanel>
        }
      />

      <List.Item
        icon="blender.png"
        title="blender"
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              target={
                <List>
                  <List.Item title="-> g" icon="blender-g.png" accessories={[{ text: "move" }]} />
                  <List.Item title="-> s" icon="blender-s.png" accessories={[{ text: "scale" }]} />
                </List>
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
