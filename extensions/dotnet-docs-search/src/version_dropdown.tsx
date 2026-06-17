import { List } from "@raycast/api";

export function VersionDropdown(props: { onVersionChange: (version: string) => void }) {
  return (
    <List.Dropdown tooltip="Select Version" storeValue={true} onChange={props.onVersionChange}>
      <List.Dropdown.Item title="All APIs" value="all" />
      <List.Dropdown.Section title=".NET">
        <List.Dropdown.Item title=".NET 7" value="net-7.0" />
        <List.Dropdown.Item title=".NET 6" value="net-6.0" />
        <List.Dropdown.Item title=".NET 5" value="net-5.0" />
        <List.Dropdown.Item title=".NET Core 3.1" value="netcore-3.1" />
        <List.Dropdown.Item title=".NET Core 3.0" value="netcore-3.0" />
        <List.Dropdown.Item title=".NET Core 2.2" value="netcore-2.2" />
        <List.Dropdown.Item title=".NET Core 2.1" value="netcore-2.1" />
        <List.Dropdown.Item title=".NET Core 2.0" value="netcore-2.0" />
        <List.Dropdown.Item title=".NET Core 1.1" value="netcore-1.1" />
        <List.Dropdown.Item title=".NET Core 1.0" value="netcore-1.0" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title=".NET Framework">
        <List.Dropdown.Item title=".NET Framework 4.8" value="netframework-4.8" />
        <List.Dropdown.Item title=".NET Framework 4.7.2" value="netframework-4.7.2" />
        <List.Dropdown.Item title=".NET Framework 4.7.1" value="netframework-4.7.1" />
        <List.Dropdown.Item title=".NET Framework 4.7" value="netframework-4.7" />
        <List.Dropdown.Item title=".NET Framework 4.6.2" value="netframework-4.6.2" />
        <List.Dropdown.Item title=".NET Framework 4.6.1" value="netframework-4.6.1" />
        <List.Dropdown.Item title=".NET Framework 4.6" value="netframework-4.6" />
        <List.Dropdown.Item title=".NET Framework 4.5.2" value="netframework-4.5.2" />
        <List.Dropdown.Item title=".NET Framework 4.5.1" value="netframework-4.5.1" />
        <List.Dropdown.Item title=".NET Framework 4.5" value="netframework-4.5" />
        <List.Dropdown.Item title=".NET Framework 4.0" value="netframework-4.0" />
        <List.Dropdown.Item title=".NET Framework 3.5" value="netframework-3.5" />
        <List.Dropdown.Item title=".NET Framework 3.0" value="netframework-3.0" />
        <List.Dropdown.Item title=".NET Framework 2.0" value="netframework-2.0" />
        <List.Dropdown.Item title=".NET Framework 1.1" value="netframework-1.1" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="ASP.NET Core">
        <List.Dropdown.Item title="ASP.NET Core 7" value="aspnetcore-7.0" />
        <List.Dropdown.Item title="ASP.NET Core 6" value="aspnetcore-6.0" />
        <List.Dropdown.Item title="ASP.NET Core 5" value="aspnetcore-5.0" />
        <List.Dropdown.Item title="ASP.NET Core 3.1" value="aspnetcore-3.1" />
        <List.Dropdown.Item title="ASP.NET Core 3.0" value="aspnetcore-3.0" />
        <List.Dropdown.Item title="ASP.NET Core 2.2" value="aspnetcore-2.2" />
        <List.Dropdown.Item title="ASP.NET Core 2.1" value="aspnetcore-2.1" />
        <List.Dropdown.Item title="ASP.NET Core 2.0" value="aspnetcore-2.0" />
        <List.Dropdown.Item title="ASP.NET Core 1.1" value="aspnetcore-1.1" />
        <List.Dropdown.Item title="ASP.NET Core 1.0" value="aspnetcore-1.0" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
