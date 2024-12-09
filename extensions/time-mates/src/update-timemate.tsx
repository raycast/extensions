import { ActionPanel, Form, Action, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import ct from "countries-and-timezones";
import { Timemate } from "./types";
import { imageToBase64, updateTimemate } from "./utils";

interface UpdateTimeMateProps {
  timemate: Timemate;
}

interface FormValues {
  name: string;
  country: string;
  avatar: string[];
}

export default function UpdateTimeMate({ timemate }: UpdateTimeMateProps) {
  const { pop } = useNavigation();
  const countrys = Object.values(ct.getAllCountries());
  const allowedExtensions = ["png", "jpeg", "jpg", "svg"];

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: {
      name: timemate.name,
      country: timemate.country,
    },
    onSubmit: async (values) => {
      try {
        let avatarBase64 = timemate.avatar;
        if (values.avatar && values.avatar.length > 0) {
          const avatarFilePath = values.avatar[0];
          avatarBase64 = await imageToBase64(avatarFilePath);
        }

        timemate = {
          id: timemate.id,
          name: values.name,
          country: values.country,
          avatar: avatarBase64,
        };

        await updateTimemate(timemate);

        reset();
        pop();

        await showToast({
          style: Toast.Style.Success,
          title: "Successful to update time mate",
        });
      } catch (error) {
        console.error("Error saving timemate:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update time mate",
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
          <Action.SubmitForm title="Save Time Mate" onSubmit={handleSubmit} />
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
