import { PopToRootType, showHUD } from "@raycast/api";
import dayjs from "dayjs";
import { addEntry } from "./api";
import { FormData, NoteForm } from "./components/note-form";

export default function Command() {
  const onSubmit = async (data: FormData) => {
    await addEntry(data);
    await showHUD(`Note added at ${dayjs(data.date).format("DD/MM @HH:mm")}`, {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  };

  return <NoteForm onSubmit={onSubmit} />;
}
