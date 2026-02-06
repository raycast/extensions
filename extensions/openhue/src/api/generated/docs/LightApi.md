# LightApi

All URIs are relative to *https://192.168.1.0*

| Method                                     | HTTP request                              | Description  |
| ------------------------------------------ | ----------------------------------------- | ------------ |
| [**getLight**](LightApi.md#getlight)       | **GET** /clip/v2/resource/light/{lightId} | Get light    |
| [**getLights**](LightApi.md#getlights)     | **GET** /clip/v2/resource/light           | List lights. |
| [**updateLight**](LightApi.md#updatelight) | **PUT** /clip/v2/resource/light/{lightId} | Update light |

## getLight

> GetLights200Response getLight(lightId)

Get light

Get details of a single light from its given &#x60;{lightId}&#x60;.

### Example

```ts
import { Configuration, LightApi } from "@openhue/client";
import type { GetLightRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new LightApi(config);

  const body = {
    // string | ID of the light
    lightId: lightId_example,
  } satisfies GetLightRequest;

  try {
    const data = await api.getLight(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name        | Type     | Description     | Notes                     |
| ----------- | -------- | --------------- | ------------------------- |
| **lightId** | `string` | ID of the light | [Defaults to `undefined`] |

### Return type

[**GetLights200Response**](GetLights200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description            | Response headers |
| ----------- | ---------------------- | ---------------- |
| **200**     | Light Success Response | -                |
| **401**     | Unauthorized           | -                |
| **403**     | Forbidden              | -                |
| **404**     | Not Found              | -                |
| **405**     | Method Not Allowed     | -                |
| **406**     | Not Acceptable         | -                |
| **409**     | Conflict               | -                |
| **429**     | Too Many Requests      | -                |
| **500**     | Internal Server Error  | -                |
| **503**     | Service Unavailable    | -                |
| **507**     | Insufficient Storage   | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## getLights

> GetLights200Response getLights()

List lights.

List all available lights.

### Example

```ts
import { Configuration, LightApi } from "@openhue/client";
import type { GetLightsRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new LightApi(config);

  try {
    const data = await api.getLights();
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

[**GetLights200Response**](GetLights200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description            | Response headers |
| ----------- | ---------------------- | ---------------- |
| **200**     | Light Success Response | -                |
| **401**     | Unauthorized           | -                |
| **403**     | Forbidden              | -                |
| **404**     | Not Found              | -                |
| **405**     | Method Not Allowed     | -                |
| **406**     | Not Acceptable         | -                |
| **409**     | Conflict               | -                |
| **429**     | Too Many Requests      | -                |
| **500**     | Internal Server Error  | -                |
| **503**     | Service Unavailable    | -                |
| **507**     | Insufficient Storage   | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## updateLight

> UpdateDevice200Response updateLight(lightId, lightPut)

Update light

Update a single light from its given &#x60;{lightId}&#x60;.

### Example

```ts
import { Configuration, LightApi } from "@openhue/client";
import type { UpdateLightRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new LightApi(config);

  const body = {
    // string | ID of the light
    lightId: lightId_example,
    // LightPut (optional)
    lightPut: { on: { on: true } },
  } satisfies UpdateLightRequest;

  try {
    const data = await api.updateLight(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name         | Type                    | Description     | Notes                     |
| ------------ | ----------------------- | --------------- | ------------------------- |
| **lightId**  | `string`                | ID of the light | [Defaults to `undefined`] |
| **lightPut** | [LightPut](LightPut.md) |                 | [Optional]                |

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
