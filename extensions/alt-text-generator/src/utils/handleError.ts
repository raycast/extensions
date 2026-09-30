import { showError } from "@utils/showError";

export const handleError = async (error: unknown) => {
  console.log(error);
  if (error instanceof Error) {
    await showError(error, { title: error.message });
  } else {
    await showError(new Error("An unknown error occurred"), { title: "An unknown error occurred" });
  }
};
