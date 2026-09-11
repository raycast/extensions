import { ProfileProvider } from "@src/contexts";

/**
 * Higher-order component that wraps a component with ProfileProvider.
 *
 * Provides profile and environment management to the wrapped component:
 * - Multi-profile support (switch between different Stripe accounts)
 * - Environment switching (test/live mode)
 * - API key management per profile and environment
 * - Welcome screen for first-time setup (can be skipped)
 *
 * This is the recommended way to add Stripe context to view components.
 *
 * @param Component - The component to wrap with profile context
 * @param options - Configuration options
 * @param options.skipGuide - If true, skips the welcome screen for new profiles
 * @returns Wrapped component with profile and environment state management
 *
 * @example
 * ```tsx
 * const MyStripeView = () => {
 *   const { activeProfile, activeEnvironment } = useProfileContext();
 *   return <div>{activeProfile?.name} - {activeEnvironment}</div>;
 * };
 *
 * // Standard usage - shows welcome screen for new users
 * export default withProfileContext(MyStripeView);
 *
 * // Skip welcome screen (for non-interactive commands)
 * export default withProfileContext(MyStripeView, { skipGuide: true });
 * ```
 */
export const withProfileContext = <P extends object>(Component: React.FC<P>, options?: { skipGuide?: boolean }) => {
  return (props: P) => {
    return (
      <ProfileProvider skipGuide={options?.skipGuide}>
        <Component {...props} />
      </ProfileProvider>
    );
  };
};
