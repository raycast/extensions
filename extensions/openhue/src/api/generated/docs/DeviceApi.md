# DeviceApi

All URIs are relative to *https://192.168.1.0*

| Method                                        | HTTP request                                   | Description   |
| --------------------------------------------- | ---------------------------------------------- | ------------- |
| [**deleteDevice**](DeviceApi.md#deletedevice) | **DELETE** /clip/v2/resource/device/{deviceId} | Delete Device |
| [**getDevice**](DeviceApi.md#getdevice)       | **GET** /clip/v2/resource/device/{deviceId}    | Get device    |
| [**getDevices**](DeviceApi.md#getdevices)     | **GET** /clip/v2/resource/device               | List devices  |
| [**updateDevice**](DeviceApi.md#updatedevice) | **PUT** /clip/v2/resource/device/{deviceId}    | Update device |

## deleteDevice

> UpdateDevice200Response deleteDevice(deviceId)

Delete Device

Delete a single Device from its given &#x60;{deviceId}&#x60;. The &#x60;bridge&#x60; device cannot be deleted.

### Example

```ts
import { Configuration, DeviceApi } from "@openhue/client";
import type { DeleteDeviceRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new DeviceApi(config);

  const body = {
    // string | ID of the Device
    deviceId: deviceId_example,
  } satisfies DeleteDeviceRequest;

  try {
    const data = await api.deleteDevice(body);
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
| **deviceId** | `string` | ID of the Device | [Defaults to `undefined`] |

### Return type

[**UpdateDevice200Response**](UpdateDevice200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
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

## getDevice

> GetDevices200Response getDevice(deviceId)

Get device

Get details of a single device from its given &#x60;{deviceId}&#x60;.

### Example

```ts
import { Configuration, DeviceApi } from "@openhue/client";
import type { GetDeviceRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new DeviceApi(config);

  const body = {
    // string | ID of the device
    deviceId: deviceId_example,
  } satisfies GetDeviceRequest;

  try {
    const data = await api.getDevice(body);
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

[**GetDevices200Response**](GetDevices200Response.md)

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

## getDevices

> GetDevices200Response getDevices()

List devices

List all available devices

### Example

```ts
import { Configuration, DeviceApi } from "@openhue/client";
import type { GetDevicesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new DeviceApi(config);

  try {
    const data = await api.getDevices();
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

[**GetDevices200Response**](GetDevices200Response.md)

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

## updateDevice

> UpdateDevice200Response updateDevice(deviceId, devicePut)

Update device

Update a single device from its given &#x60;{deviceId}&#x60;.

### Example

```ts
import { Configuration, DeviceApi } from "@openhue/client";
import type { UpdateDeviceRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new DeviceApi(config);

  const body = {
    // string | ID of the device
    deviceId: deviceId_example,
    // DevicePut (optional)
    devicePut: { identify: { action: "identify" } },
  } satisfies UpdateDeviceRequest;

  try {
    const data = await api.updateDevice(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name          | Type                      | Description      | Notes                     |
| ------------- | ------------------------- | ---------------- | ------------------------- |
| **deviceId**  | `string`                  | ID of the device | [Defaults to `undefined`] |
| **devicePut** | [DevicePut](DevicePut.md) |                  | [Optional]                |

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
