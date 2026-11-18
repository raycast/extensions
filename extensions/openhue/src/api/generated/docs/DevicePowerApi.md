# DevicePowerApi

All URIs are relative to *https://192.168.1.0*

| Method                                                   | HTTP request                                      | Description        |
| -------------------------------------------------------- | ------------------------------------------------- | ------------------ |
| [**getDevicePower**](DevicePowerApi.md#getdevicepower)   | **GET** /clip/v2/resource/device_power/{deviceId} | Get device power   |
| [**getDevicePowers**](DevicePowerApi.md#getdevicepowers) | **GET** /clip/v2/resource/device_power            | List device powers |

## getDevicePower

> GetDevicePowers200Response getDevicePower(deviceId)

Get device power

Get power details of a single device from its given &#x60;{deviceId}&#x60;.

### Example

```ts
import { Configuration, DevicePowerApi } from "@openhue/client";
import type { GetDevicePowerRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new DevicePowerApi(config);

  const body = {
    // string | ID of the device
    deviceId: deviceId_example,
  } satisfies GetDevicePowerRequest;

  try {
    const data = await api.getDevicePower(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name         | Type     | Description      | Notes                     |
| ------------ | -------- | ---------------- | ------------------------- |
| **deviceId** | `string` | ID of the device | [Defaults to `undefined`] |

### Return type

[**GetDevicePowers200Response**](GetDevicePowers200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description             | Response headers |
| ----------- | ----------------------- | ---------------- |
| **200**     | Device Success Response | -                |
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

## getDevicePowers

> GetDevicePowers200Response getDevicePowers()

List device powers

List all available device powers

### Example

```ts
import { Configuration, DevicePowerApi } from "@openhue/client";
import type { GetDevicePowersRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new DevicePowerApi(config);

  try {
    const data = await api.getDevicePowers();
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

[**GetDevicePowers200Response**](GetDevicePowers200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                   | Response headers |
| ----------- | ----------------------------- | ---------------- |
| **200**     | Device Power Success Response | -                |
| **401**     | Unauthorized                  | -                |
| **403**     | Forbidden                     | -                |
| **404**     | Not Found                     | -                |
| **405**     | Method Not Allowed            | -                |
| **406**     | Not Acceptable                | -                |
| **409**     | Conflict                      | -                |
| **429**     | Too Many Requests             | -                |
| **500**     | Internal Server Error         | -                |
| **503**     | Service Unavailable           | -                |
| **507**     | Insufficient Storage          | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
