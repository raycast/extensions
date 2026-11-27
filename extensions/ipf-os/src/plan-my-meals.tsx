import { List, type LaunchProps } from "@raycast/api";
import { useSession } from "./lib/hooks/use-session";
import { mealsAccountKey } from "./lib/meals/drafts";
import { AuthErrorView } from "./views/auth-error";
import { MealPlanner } from "./views/meals/planner";

export default function PlanMyMealsCommand(props: LaunchProps<{ launchContext: { review?: boolean } }>) {
  const { session, error, revalidate } = useSession();
  if (error) return <AuthErrorView error={error} onRetry={revalidate} />;
  if (!session) return <List isLoading />;
  return (
    <MealPlanner
      key={mealsAccountKey(session.subject)}
      account={mealsAccountKey(session.subject)}
      reviewOnOpen={props.launchContext?.review === true}
    />
  );
}
