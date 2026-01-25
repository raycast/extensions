import { useContext } from "react";
import { ProfileContext } from "@src/contexts/profile-context";
import { ProfileContextValue } from "@src/types";

export const useProfileContext = (): ProfileContextValue => {
  const context = useContext(ProfileContext);

  if (context === undefined) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }

  return context;
};
