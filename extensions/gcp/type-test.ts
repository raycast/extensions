// Type validation test file - this can be deleted after verification
import {
  CloudRunServiceResponse,
  ProcessedMetricsData,
  ProcessedErrorData,
  MonitoringResponse,
  LoggingResponse,
} from "./utils/cloud-run-types";

import {
  transformCloudRunResponse,
  processMetricsResponse,
  processLoggingResponse,
  isValidCloudRunResponse,
  isValidMonitoringResponse,
  isValidLoggingResponse,
} from "./utils/cloud-run-helpers";

// Test that our types compile correctly

// Mock Cloud Run response
const mockCloudRunResponse: CloudRunServiceResponse = {
  items: [
    {
      metadata: {
        name: "test-service",
        annotations: {
          "run.googleapis.com/lastModifier": "user@example.com",
        },
      },
      spec: {
        template: {
          spec: {
            containers: [
              {
                image: "gcr.io/project/image:latest",
                resources: {
                  limits: {
                    cpu: "1000m",
                    memory: "512Mi",
                  },
                },
              },
            ],
          },
        },
        traffic: [
          {
            revisionName: "test-service-001",
            percent: 100,
          },
        ],
      },
      status: {
        url: "https://test-service-12345-uc.a.run.app",
        conditions: [
          {
            status: "True",
            type: "Ready",
          },
        ],
      },
    },
  ],
};

// Mock monitoring response
const mockMonitoringResponse: MonitoringResponse = {
  timeSeries: [
    {
      points: [
        {
          interval: {
            endTime: "2024-01-01T12:00:00Z",
          },
          value: {
            doubleValue: "1.5",
          },
        },
      ],
    },
  ],
};

// Mock logging response
const mockLoggingResponse: LoggingResponse = {
  entries: [
    {
      timestamp: "2024-01-01T12:00:00Z",
      severity: "ERROR",
      textPayload: "Test error message",
      resource: {
        type: "cloud_run_revision",
        labels: {
          service_name: "test-service",
          location: "us-central1",
        },
      },
    },
  ],
};

// Test type guards
const isValidCR: boolean = isValidCloudRunResponse(mockCloudRunResponse);
const isValidMon: boolean = isValidMonitoringResponse(mockMonitoringResponse);
const isValidLog: boolean = isValidLoggingResponse(mockLoggingResponse);

// Test transformation functions
const transformedServices = transformCloudRunResponse(mockCloudRunResponse, "us-central1");
const processedMetrics = processMetricsResponse(mockMonitoringResponse, "requestCount", 300);
const processedErrors = processLoggingResponse(mockLoggingResponse);

// Verify return types
const service = transformedServices[0];
const metric = processedMetrics[0];
const error = processedErrors[0];

// These should all compile without type errors
console.log("Type test passed:", {
  serviceName: service?.name,
  metricValue: metric?.value,
  errorMessage: error?.message,
  validations: { isValidCR, isValidMon, isValidLog },
});

export {}; // Make this a module
