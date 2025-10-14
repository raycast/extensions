import { Color, Grid } from "@raycast/api";
import { familyStylesByPrefix, iconForStyle } from "@/utils/data";

type StyleSelectorProps = {
  setType: (newValue: string) => void;
  STYLE_PREFERENCE: string;
  account: string;
};

export const StyleSelector = ({ setType, STYLE_PREFERENCE, account }: StyleSelectorProps) => {
  return (
    <Grid.Dropdown
      tooltip="Select Family & Style"
      onChange={(newValue) => setType(newValue)}
      defaultValue={STYLE_PREFERENCE}
    >
      {account === "pro" ? (
        <>
          <Grid.Dropdown.Section title="Classic Icons">
            {Object.entries(familyStylesByPrefix)
              .slice(8, 13)
              .map(([key, value]) => (
                <Grid.Dropdown.Item
                  key={key}
                  title={value}
                  value={key}
                  icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                />
              ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Sharp Icons">
            {Object.entries(familyStylesByPrefix)
              .slice(0, 4)
              .map(([key, value]) => (
                <Grid.Dropdown.Item
                  key={key}
                  title={value}
                  value={key}
                  icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                />
              ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Duotone Icons">
            {Object.entries(familyStylesByPrefix)
              .slice(4, 8)
              .map(([key, value]) => (
                <Grid.Dropdown.Item
                  key={key}
                  title={value}
                  value={key}
                  icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                />
              ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Sharp Duotone Icons">
            {Object.entries(familyStylesByPrefix)
              .slice(13, 17)
              .map(([key, value]) => (
                <Grid.Dropdown.Item
                  key={key}
                  title={value}
                  value={key}
                  icon={{ source: iconForStyle(key), tintColor: Color.SecondaryText }}
                />
              ))}
          </Grid.Dropdown.Section>
        </>
      ) : (
        <>
          <Grid.Dropdown.Item
            key="fas"
            title="Classic, Solid"
            value="fas"
            icon={{ source: iconForStyle("fas"), tintColor: Color.SecondaryText }}
          />
          <Grid.Dropdown.Item
            key="fab"
            title="Classic, Brands"
            value="fab"
            icon={{ source: iconForStyle("fab"), tintColor: Color.SecondaryText }}
          />
        </>
      )}
    </Grid.Dropdown>
  );
};
