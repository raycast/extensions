# BridgeHomeApi

All URIs are relative to *https://192.168.1.0*

| Method                                                | HTTP request                                         | Description        |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------ |
| [**getBridgeHome**](BridgeHomeApi.md#getbridgehome)   | **GET** /clip/v2/resource/bridge_home/{bridgeHomeId} | Get bridge home.   |
| [**getBridgeHomes**](BridgeHomeApi.md#getbridgehomes) | **GET** /clip/v2/resource/bridge_home                | List bridge homes. |

## getBridgeHome

> GetBridgeHomes200Response getBridgeHome(bridgeHomeId)

Get bridge home.

Get details of a single bridge home from its given &#x60;{bridgeHomeId}&#x60;.

### Example

```ts
import { Configuration, BridgeHomeApi } from "@openhue/client";
import type { GetBridgeHomeRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new BridgeHomeApi(config);

  const body = {
    // string | ID of the bridge home.
    bridgeHomeId: bridgeHomeId_example,
  } satisfies GetBridgeHomeRequest;

  try {
    const data = await api.getBridgeHome(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name             | Type     | Description            | Notes                     |
| ---------------- | -------- | ---------------------- | ------------------------- |
| **bridgeHomeId** | `string` | ID of the bridge home. | [Defaults to `undefined`] |

### Return type

[**GetBridgeHomes200Response**](GetBridgeHomes200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Bridge Home Success Response | -                |
| **401**     | Unauthorized                 | -                |
| **403**     | Forbidden                    | -                |
| **404**     | Not Found                    | -                |
| **405**     | Method Not Allowed           | -                |
| **406**     | Not Acceptable               | -                |
| **409**     | Conflict                     | -                |
| **429**     | Too Many Requests            | -                |
| **500**     | Internal Server Error        | -                |
| **503**     | Service Unavailable          | -                |
| **507**     | Insufficient Storage         | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## getBridgeHomes

> GetBridgeHomes200Response getBridgeHomes()

List bridge homes.

List all available bridge homes.

### Example

```ts
import { Configuration, BridgeHomeApi } from "@openhue/client";
import type { GetBridgeHomesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new BridgeHomeApi(config);

  try {
    const data = await api.getBridgeHomes();
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

[**GetBridgeHomes200Response**](GetBridgeHomes200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Bridge Home Success Response | -                |
| **401**     | Unauthorized                 | -                |
| **403**     | Forbidden                    | -                |
| **404**     | Not Found                    | -                |
| **405**     | Method Not Allowed           | -                |
| **406**     | Not Acceptable               | -                |
| **409**     | Conflict                     | -                |
| **429**     | Too Many Requests            | -                |
| **500**     | Internal Server Error        | -                |
| **503**     | Service Unavailable          | -                |
| **507**     | Insufficient Storage         | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
