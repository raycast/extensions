import { Grid } from "@raycast/api";
import { capitalizeFirstLetter } from "../utils";

export function EnvironmentDropdown({
  environments,
  onChange,
}: {
  environments: string[];
  onChange: (env: string) => void;
}) {
  return (
    <Grid.Dropdown tooltip="Environment" storeValue onChange={(newValue) => onChange(newValue as string)}>
      {environments.map((env) => (
        <Grid.Dropdown.Item key={env} title={capitalizeFirstLetter(env)} value={env} />
      ))}
    </Grid.Dropdown>
  );
}
