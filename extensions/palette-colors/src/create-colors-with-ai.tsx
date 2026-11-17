import { Grid, Icon, LaunchProps } from "@raycast/api";
import { CreateColorsActions } from "./components/CreateColorsActions";
import { useAIcolors } from "./hooks/useAIcolors";
import { useColorsSelection } from "./hooks/useColorsSelection";

export default function CreateColorsWithAi(props: LaunchProps<{ arguments: Arguments.CreateColorsWithAi }>) {
  const { prompt, creativity, totalColors } = props.arguments;

  const { isLoading, colorItems, title, description, error } = useAIcolors({
    creativity,
    totalColors,
    prompt,
  });

  const { selection } = useColorsSelection(colorItems);

  return (
    <Grid isLoading={isLoading}>
      {!isLoading && error && <Grid.EmptyView icon={Icon.EyeDisabled} title={error} />}
      {!isLoading && colorItems.length === 0 && (
        <Grid.EmptyView icon={Icon.EyeDisabled} title={"The AI could not create the colors. Please try again."} />
      )}
      {!isLoading &&
        colorItems.length > 0 &&
        colorItems.map((colorItem) => {
          const { color } = colorItem;
          const isSelected = selection.helpers.getIsItemSelected(colorItem);
          const content = isSelected
            ? {
                source: Icon.CircleFilled,
                tintColor: { light: color, dark: color, adjustContrast: true },
              }
            : { color: { light: color, dark: color, adjustContrast: false } };

          return (
            <Grid.Item
              key={colorItem.id}
              content={content}
              title={`${isSelected ? "✓ " : ""}${color}`}
              actions={
                <CreateColorsActions colorItem={colorItem} selection={selection} AItext={{ title, description }} />
              }
            />
          );
        })}
    </Grid>
  );
}
