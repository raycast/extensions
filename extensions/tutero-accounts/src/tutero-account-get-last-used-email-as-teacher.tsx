import { copyLastSignedUpEmail, UserType } from "./utils";

export default async function Main() {
    await copyLastSignedUpEmail(UserType.Teacher);
}
