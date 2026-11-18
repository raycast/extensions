import AIGatewayLogsList from "./pages/lists/ai-gateway-logs-list";
import WithValidToken from "./pages/with-valid-token";

export default function Command() {
  return (
    <WithValidToken>
      <AIGatewayLogsList />
    </WithValidToken>
  );
}
