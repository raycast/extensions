# BridgeApi

All URIs are relative to *https://192.168.1.0*

| Method                                        | HTTP request                                | Description   |
| --------------------------------------------- | ------------------------------------------- | ------------- |
| [**getBridge**](BridgeApi.md#getbridge)       | **GET** /clip/v2/resource/bridge/{bridgeId} | Get bridge    |
| [**getBridges**](BridgeApi.md#getbridges)     | **GET** /clip/v2/resource/bridge            | List bridges  |
| [**updateBridge**](BridgeApi.md#updatebridge) | **PUT** /clip/v2/resource/bridge/{bridgeId} | Update bridge |

## getBridge

> GetBridges200Response getBridge(bridgeId)

Get bridge

Get details of a single bridge from its given &#x60;{bridgeId}&#x60;.

### Example

```ts
import { Configuration, BridgeApi } from "@openhue/client";
import type { GetBridgeRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new BridgeApi(config);

  const body = {
    // string | ID of the bridge
    bridgeId: bridgeId_example,
  } satisfies GetBridgeRequest;

  try {
    const data = await api.getBridge(body);
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
| **bridgeId** | `string` | ID of the bridge | [Defaults to `undefined`] |

### Return type

[**GetBridges200Response**](GetBridges200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description             | Response headers |
| ----------- | ----------------------- | ---------------- |
| **200**     | Bridge Success Response | -                |
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

## getBridges

> GetBridges200Response getBridges()

List bridges

List all available bridges

### Example

```ts
import { Configuration, BridgeApi } from "@openhue/client";
import type { GetBridgesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new BridgeApi(config);

  try {
    const data = await api.getBridges();
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

[**GetBridges200Response**](GetBridges200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description             | Response headers |
| ----------- | ----------------------- | ---------------- |
| **200**     | Bridge Success Response | -                |
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

## updateBridge

> UpdateDevice200Response updateBridge(bridgeId, bridgePut)

Update bridge

Update a single bridge from its given &#x60;{bridgeId}&#x60;.

### Example

```ts
import {
  Configuration,
  BridgeApi,
} from '@openhue/client';
import type { UpdateBridgeRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new BridgeApi(config);

  const body = {
    // string | ID of the bridge
    bridgeId: bridgeId_example,
    // BridgePut (optional)
    bridgePut: ...,
  } satisfies UpdateBridgeRequest;

  try {
    const data = await api.updateBridge(body);
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
| **bridgeId**  | `string`                  | ID of the bridge | [Defaults to `undefined`] |
| **bridgePut** | [BridgePut](BridgePut.md) |                  | [Optional]                |

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
