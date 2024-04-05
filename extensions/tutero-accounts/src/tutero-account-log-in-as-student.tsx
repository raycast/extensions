import { autofillPopup, PopupType, UserType } from "./utils";

export default async function Main() {
    await autofillPopup(PopupType.LogIn, UserType.Student);
}
