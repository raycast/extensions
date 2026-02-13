# MotionApi

All URIs are relative to *https://192.168.1.0*

| Method                                                    | HTTP request                                | Description          |
| --------------------------------------------------------- | ------------------------------------------- | -------------------- |
| [**getMotionSensor**](MotionApi.md#getmotionsensor)       | **GET** /clip/v2/resource/motion/{motionId} | Get motion sensor.   |
| [**getMotionSensors**](MotionApi.md#getmotionsensors)     | **GET** /clip/v2/resource/motion            | List motion sensors. |
| [**updateMotionSensor**](MotionApi.md#updatemotionsensor) | **PUT** /clip/v2/resource/motion/{motionId} | Update Motion Sensor |

## getMotionSensor

> GetMotionSensors200Response getMotionSensor(motionId)

Get motion sensor.

Get details of a single motion sensor from its given &#x60;{motionId}&#x60;.

### Example

```ts
import { Configuration, MotionApi } from "@openhue/client";
import type { GetMotionSensorRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new MotionApi(config);

  const body = {
    // string | ID of the motion sensor
    motionId: motionId_example,
  } satisfies GetMotionSensorRequest;

  try {
    const data = await api.getMotionSensor(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name         | Type     | Description             | Notes                     |
| ------------ | -------- | ----------------------- | ------------------------- |
| **motionId** | `string` | ID of the motion sensor | [Defaults to `undefined`] |

### Return type

[**GetMotionSensors200Response**](GetMotionSensors200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description             | Response headers |
| ----------- | ----------------------- | ---------------- |
| **200**     | Motion Success Response | -                |
| **401**     | Unauthorized            | -                |
| **403**     | Forbidden               | -                |
| **404**     | Not Found               | -                |
| **405**     | Method Not Allowed      | -                |
| **406**     | Not Acceptable          | -                |
| **409**     | Conflict                | -                |
| **429**     | Too Many Requests       | -                |
| **500**     | Internal Server Error   | -                |
| **503**     | Service Unavailable     | -                |
| **507**     | Insufficient Storage    | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## getMotionSensors

> GetMotionSensors200Response getMotionSensors()

List motion sensors.

List all available motion sensors.

### Example

```ts
import { Configuration, MotionApi } from "@openhue/client";
import type { GetMotionSensorsRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new MotionApi(config);

  try {
    const data = await api.getMotionSensors();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**GetMotionSensors200Response**](GetMotionSensors200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description             | Response headers |
| ----------- | ----------------------- | ---------------- |
| **200**     | Motion Success Response | -                |
| **401**     | Unauthorized            | -                |
| **403**     | Forbidden               | -                |
| **404**     | Not Found               | -                |
| **405**     | Method Not Allowed      | -                |
| **406**     | Not Acceptable          | -                |
| **409**     | Conflict                | -                |
| **429**     | Too Many Requests       | -                |
| **500**     | Internal Server Error   | -                |
| **503**     | Service Unavailable     | -                |
| **507**     | Insufficient Storage    | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## updateMotionSensor

> UpdateDevice200Response updateMotionSensor(motionId, motionPut)

Update Motion Sensor

Update a single motion sensor from its given &#x60;{motionId}&#x60;.

### Example

```ts
import { Configuration, MotionApi } from "@openhue/client";
import type { UpdateMotionSensorRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new MotionApi(config);

  const body = {
    // string | Id of the motion sensor
    motionId: motionId_example,
    // MotionPut (optional)
    motionPut: { enabled: true },
  } satisfies UpdateMotionSensorRequest;

  try {
    const data = await api.updateMotionSensor(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name          | Type                      | Description             | Notes                     |
| ------------- | ------------------------- | ----------------------- | ------------------------- |
| **motionId**  | `string`                  | Id of the motion sensor | [Defaults to `undefined`] |
| **motionPut** | [MotionPut](MotionPut.md) |                         | [Optional]                |

### Return type

[**UpdateDevice200Response**](UpdateDevice200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`

### HTTP response details

| Status code | Description           | Response headers |
| ----------- | --------------------- | ---------------- |
| **200**     | Success               | -                |
| **401**     | Unauthorized          | -                |
| **403**     | Forbidden             | -                |
| **404**     | Not Found             | -                |
| **405**     | Method Not Allowed    | -                |
| **406**     | Not Acceptable        | -                |
| **409**     | Conflict              | -                |
| **429**     | Too Many Requests     | -                |
| **500**     | Internal Server Error | -                |
| **503**     | Service Unavailable   | -                |
| **507**     | Insufficient Storage  | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
