import OpenProfileForm from "./forms/open-profile-form";

interface OpenProfileCommandProps {
  arguments: { profile: string };
}

export default function OpenProfileCommand({ arguments: args }: OpenProfileCommandProps) {
  return <OpenProfileForm initialProfile={args.profile} />;
}
