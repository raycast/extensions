import { ARIO } from "@ar.io/sdk";
import 'cross-fetch/polyfill';

// Constants
const TOP_GATEWAY_LIMIT = 25;
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const EMA_ALPHA = 0.2; // Smoothing factor for exponential moving average

interface GatewayPerformance {
    fqdn: string;
    avgResponseTime: number;
    failures: number;
    successCount: number;
    lastChecked: number;
    healthy: boolean;
}

/**
 * Check if a gateway is healthy
 */
async function checkGatewayHealth(fqdn: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

        const response = await fetch(`https://${fqdn}`, {
            method: "HEAD",
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Main function to test gateway performance
 */
async function testGatewayPerformance() {
    try {
        console.log("Initializing AR.IO SDK...");
        const arIO = ARIO.init();

        console.log("Fetching gateways...");
        const gatewaysResult = await arIO.getGateways();

        if (!gatewaysResult?.items?.length) {
            console.error("No gateways found!");
            return;
        }

        console.log(`Found ${gatewaysResult.items.length} gateways. Testing health...`);

        // Get all gateways and check their health in parallel
        const healthChecks = await Promise.all(
            gatewaysResult.items.map(async (gateway) => {
                const start = performance.now();
                const fqdn = gateway.settings.fqdn;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

                    const response = await fetch(`https://${fqdn}`, {
                        method: "HEAD",
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    const responseTime = performance.now() - start;
                    return {
                        fqdn,
                        healthy: response.ok,
                        avgResponseTime: responseTime,
                        failures: response.ok ? 0 : 1,
                        successCount: response.ok ? 1 : 0,
                        lastChecked: Date.now()
                    };
                } catch (error) {
                    return {
                        fqdn,
                        healthy: false,
                        avgResponseTime: Infinity,
                        failures: 1,
                        successCount: 0,
                        lastChecked: Date.now()
                    };
                }
            })
        );

        // Sort results
        const sortedResults = healthChecks.sort((a, b) => {
            // Sort by health first, then by response time
            if (a.healthy !== b.healthy) return b.healthy ? 1 : -1;
            return a.avgResponseTime - b.avgResponseTime;
        });

        console.log("\nGateway Performance Results:");
        console.log("=============================");

        sortedResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.fqdn}`);
            console.log(`   Health: ${result.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
            console.log(`   Response Time: ${result.avgResponseTime === Infinity ? 'Timeout' : `${result.avgResponseTime.toFixed(2)}ms`}`);
            console.log(`   Success/Failure: ${result.successCount}/${result.failures}`);
        });

        // Find best gateway
        const bestGateway = sortedResults.find(r => r.healthy);
        if (bestGateway) {
            console.log("\nRecommended Gateway:");
            console.log(`➡️  ${bestGateway.fqdn} (${bestGateway.avgResponseTime.toFixed(2)}ms)`);
        } else {
            console.log("\n⚠️  No healthy gateways found! Fallback to arweave.net");
        }
    } catch (error) {
        console.error("Error testing gateways:", error);
        if (error instanceof Error) {
            console.error("Error details:", error.message);
            console.error("Stack trace:", error.stack);
        }
    }
}

// Run the test
testGatewayPerformance(); 