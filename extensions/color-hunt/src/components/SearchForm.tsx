import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Tags } from "../type";

export const SearchForm = ({ submitCallback, tags }: { submitCallback: (values: Tags) => void; tags: Tags }) => {
  const { reset, handleSubmit, itemProps } = useForm<Tags>({
    onSubmit: submitCallback,
    initialValues: tags,
  });

  // same with https://colorhunt.co
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Color" onSubmit={handleSubmit} />
          <Action
            title="Reset"
            onAction={() => {
              reset({
                colors: [],
                collections: [],
              });
            }}
            icon={Icon.RotateAntiClockwise}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker title="Colors" {...itemProps.colors}>
        <Form.TagPicker.Item value="blue" title="Blue" icon={{ source: Icon.CircleFilled, tintColor: "#3da5ff" }} />
        <Form.TagPicker.Item value="teal" title="Teal" icon={{ source: Icon.CircleFilled, tintColor: "#00b9a8" }} />
        <Form.TagPicker.Item value="mint" title="Mint" icon={{ source: Icon.CircleFilled, tintColor: "#83f3b8" }} />
        <Form.TagPicker.Item value="green" title="Green" icon={{ source: Icon.CircleFilled, tintColor: "#74dc2e" }} />
        <Form.TagPicker.Item value="sage" title="Sage" icon={{ source: Icon.CircleFilled, tintColor: "#afbf8d" }} />
        <Form.TagPicker.Item value="yellow" title="Yellow" icon={{ source: Icon.CircleFilled, tintColor: "#ffe272" }} />
        <Form.TagPicker.Item value="beige" title="Beige" icon={{ source: Icon.CircleFilled, tintColor: "#f1d299" }} />
        <Form.TagPicker.Item value="brown" title="Brown" icon={{ source: Icon.CircleFilled, tintColor: "#986a33" }} />
        <Form.TagPicker.Item value="orange" title="Orange" icon={{ source: Icon.CircleFilled, tintColor: "#ff9351" }} />
        <Form.TagPicker.Item value="peach" title="Peach" icon={{ source: Icon.CircleFilled, tintColor: "#eba39c" }} />
        <Form.TagPicker.Item value="red" title="Red" icon={{ source: Icon.CircleFilled, tintColor: "#ff3737" }} />
        <Form.TagPicker.Item value="maroon" title="Maroon" icon={{ source: Icon.CircleFilled, tintColor: "#a72626" }} />
        <Form.TagPicker.Item value="pink" title="Pink" icon={{ source: Icon.CircleFilled, tintColor: "#ff74bc" }} />
        <Form.TagPicker.Item value="purple" title="Purple" icon={{ source: Icon.CircleFilled, tintColor: "#bf51e0" }} />
        <Form.TagPicker.Item value="navy" title="Navy" icon={{ source: Icon.CircleFilled, tintColor: "#414796" }} />
        <Form.TagPicker.Item value="black" title="Black" icon={{ source: Icon.CircleFilled, tintColor: "#333" }} />
        <Form.TagPicker.Item value="grey" title="Grey" icon={{ source: Icon.CircleFilled, tintColor: "#dcdcdc" }} />
        <Form.TagPicker.Item value="white" title="White" icon={{ source: Icon.CircleFilled, tintColor: "#fff" }} />
      </Form.TagPicker>

      <Form.TagPicker title="Collections" {...itemProps.collections}>
        <Form.TagPicker.Item value="pastel" title="Pastel" />
        <Form.TagPicker.Item value="vintage" title="Vintage" />
        <Form.TagPicker.Item value="retro" title="Retro" />
        <Form.TagPicker.Item value="neon" title="Neon" />
        <Form.TagPicker.Item value="gold" title="Gold" />
        <Form.TagPicker.Item value="light" title="Light" />
        <Form.TagPicker.Item value="dark" title="Dark" />
        <Form.TagPicker.Item value="warm" title="Warm" />
        <Form.TagPicker.Item value="cold" title="Cold" />
        <Form.TagPicker.Item value="summer" title="Summer" />
        <Form.TagPicker.Item value="fall" title="Fall" />
        <Form.TagPicker.Item value="winter" title="Winter" />
        <Form.TagPicker.Item value="spring" title="Spring" />
        <Form.TagPicker.Item value="happy" title="Happy" />
        <Form.TagPicker.Item value="nature" title="Nature" />
        <Form.TagPicker.Item value="earth" title="Earth" />
        <Form.TagPicker.Item value="night" title="Night" />
        <Form.TagPicker.Item value="space" title="Space" />
        <Form.TagPicker.Item value="rainbow" title="Rainbow" />
        <Form.TagPicker.Item value="gradient" title="Gradient" />
        <Form.TagPicker.Item value="sunset" title="Sunset" />
        <Form.TagPicker.Item value="sky" title="Sky" />
        <Form.TagPicker.Item value="sea" title="Sea" />
        <Form.TagPicker.Item value="kids" title="Kids" />
        <Form.TagPicker.Item value="skin" title="Skin" />
        <Form.TagPicker.Item value="food" title="Food" />
        <Form.TagPicker.Item value="cream" title="Cream" />
        <Form.TagPicker.Item value="coffee" title="Coffee" />
        <Form.TagPicker.Item value="wedding" title="Wedding" />
        <Form.TagPicker.Item value="christmas" title="Christmas" />
        <Form.TagPicker.Item value="halloween" title="Halloween" />
      </Form.TagPicker>
    </Form>
  );
};
