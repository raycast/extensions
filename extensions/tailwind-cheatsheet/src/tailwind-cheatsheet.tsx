import { List } from "@raycast/api";
import cheatsheet from './cheatsheet'

export default function Command() {
  return (
    <List>
      {Object.entries(cheatsheet).map(([title, item]) => {
        return (
          <List.Section key={title} title={title}>
            {Object.entries(item).map(([className, style]) => (
              <List.Item title={className} key={className} subtitle={style.desc} accessoryTitle={style.value} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
