import { ActionPanel, Form, Action, LocalStorage, popToRoot, Toast, showToast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import ct from "countries-and-timezones";
import { nanoid } from "nanoid";
import { imageToBase64 } from "./utils";

interface FormValues {
  name: string;
  country: string;
  avatar: string[];
}

export default function AddTimeMate() {
  const countrys = Object.values(ct.getAllCountries());
  const allowedExtensions = ["png", "jpeg", "jpg", "svg"];

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: {
      country: "TW",
    },
    onSubmit: async (values) => {
      try {
        let avatarBase64 = null;
        if (values.avatar && values.avatar.length > 0) {
          const avatarFilePath = values.avatar[0];
          avatarBase64 = await imageToBase64(avatarFilePath);
        }

        const timemate = {
          id: nanoid(),
          name: values.name,
          country: values.country,
          avatar: avatarBase64,
        };

        const storedTimemates = (await LocalStorage.getItem("timemates")) as string;
        const timemates = storedTimemates ? JSON.parse(storedTimemates) : [];

        timemates.push(timemate);
        await LocalStorage.setItem("timemates", JSON.stringify(timemates));

        await showToast({
          style: Toast.Style.Success,
          title: "Successfully added time mate",
        });

        reset();
        popToRoot();
      } catch (error) {
        console.error("Error saving timemate:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add time mate",
        });
      }
    },
    validation: {
      name: FormValidation.Required,
      country: FormValidation.Required,
      avatar: (files: string[] | undefined) => {
        if (files && files.length != 0) {
          const fileName = files[0];
          const fileExtension = fileName.split(".").pop()?.toLowerCase();

          if (!allowedExtensions.includes(fileExtension as string)) {
            return "Only PNG, JPEG, JPG, and SVG files are allowed";
          }
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Time Mate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" />
      <Form.Dropdown {...itemProps.country} title="Country">
        {countrys.map((country: ct.Country, index: number) => (
          <Form.Dropdown.Item key={index} value={country.id} title={country.name} />
        ))}
      </Form.Dropdown>
      <Form.FilePicker {...itemProps.avatar} allowMultipleSelection={false} title="Avatar" />
    </Form>
  );
}
