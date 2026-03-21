import { useProfileData } from "./hooks";
import { ErrorDetail } from "./components";
import { ProfileList } from "./components/ProfileList";

export default function ProfileView() {
  const { profiles, isLoading, appError, refresh } = useProfileData();
  // preferences/network error state

  const refreshAll = () => {
    refresh();
  };

  if (appError) {
    return <ErrorDetail error={appError} />;
  }

  return <ProfileList profileResults={profiles} isLoading={isLoading} appError={appError} onRefresh={refreshAll} />;
}
