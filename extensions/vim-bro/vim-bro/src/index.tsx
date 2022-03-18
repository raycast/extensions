import { List } from "@raycast/api";
import commands from './commands.json';

export default function Command() {
  return (
    <List>
      {
        Object.entries(commands).map(([key, value]) => {
          return (<List.Section title={key[0].toUpperCase() + key.slice(1)}>
            {value.map(command => {
              return (<List.Item
                title={command["#text"][0].toUpperCase() + command["#text"].slice(1)}
                subtitle={command.kbd}
              />)
            })}
          </List.Section>)
        })
      }
    </List>
  );
}
