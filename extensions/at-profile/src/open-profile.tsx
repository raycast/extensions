import OpenProfileForm from "./forms/open-profile-form";

/**
 * Props for the open profile command
 */
interface OpenProfileCommandProps {
  arguments: { profile: string };
}

/**
 * Main command component for opening profiles on social apps
 * @param props - Command props containing initial profile argument
 */
export default function OpenProfileCommand({ arguments: args }: OpenProfileCommandProps) {
  return <OpenProfileForm initialProfile={args.profile} />;
}
