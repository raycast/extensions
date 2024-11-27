import { Grid } from "@raycast/api";
import { FC } from "react";
import { ContextProps } from "../../hooks/preview";

export type Props = {
  context: ContextProps;
};

export const Dropdown: FC<Props> = ({ context }) => {
  const updateCurrentValue = (value: string) => {
    context.setCurrentValue(value);
  };

  return (
    <Grid.Dropdown
      tooltip="Grid Item Size"
      onChange={updateCurrentValue}
      value="current"
    >
      <Grid.Dropdown.Section title="Current">
        <Grid.Dropdown.Item title={context.preview} value={"current"} />
      </Grid.Dropdown.Section>
      <Grid.Dropdown.Section title="Favorites">
        {context.favorites.map((item) => (
          <Grid.Dropdown.Item key={item} title={item} value={item} />
        ))}
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  );
};
