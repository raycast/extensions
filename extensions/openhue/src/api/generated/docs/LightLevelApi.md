# LightLevelApi

All URIs are relative to *https://192.168.1.0*

| Method                                                    | HTTP request                                    | Description        |
| --------------------------------------------------------- | ----------------------------------------------- | ------------------ |
| [**getLightLevel**](LightLevelApi.md#getlightlevel)       | **GET** /clip/v2/resource/light_level/{lightId} | Get light          |
| [**getLightLevels**](LightLevelApi.md#getlightlevels)     | **GET** /clip/v2/resource/light_level           | List light levels. |
| [**updateLightLevel**](LightLevelApi.md#updatelightlevel) | **PUT** /clip/v2/resource/light_level/{lightId} | Update light       |

## getLightLevel

> GetLightLevels200Response getLightLevel(lightId)

Get light

Get details of a single light from its given &#x60;{lightId}&#x60;.

### Example

```ts
import { Configuration, LightLevelApi } from "@openhue/client";
import type { GetLightLevelRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new LightLevelApi(config);

  const body = {
    // string | ID of the light
    lightId: lightId_example,
  } satisfies GetLightLevelRequest;

  try {
    const data = await api.getLightLevel(body);
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

[**GetLightLevels200Response**](GetLightLevels200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Light Level Success Response | -                |
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

## getLightLevels

> GetLightLevels200Response getLightLevels()

List light levels.

List all available light levels.

### Example

```ts
import { Configuration, LightLevelApi } from "@openhue/client";
import type { GetLightLevelsRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new LightLevelApi(config);

  try {
    const data = await api.getLightLevels();
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

[**GetLightLevels200Response**](GetLightLevels200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Light Level Success Response | -                |
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

## updateLightLevel

> UpdateDevice200Response updateLightLevel(lightId, lightLevelPut)

Update light

Update a single light from its given &#x60;{lightId}&#x60;.

### Example

```ts
import { Configuration, LightLevelApi } from "@openhue/client";
import type { UpdateLightLevelRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new LightLevelApi(config);

  const body = {
    // string | ID of the light
    lightId: lightId_example,
    // LightLevelPut (optional)
    lightLevelPut: { enabled: true },
  } satisfies UpdateLightLevelRequest;

  try {
    const data = await api.updateLightLevel(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name              | Type                              | Description     | Notes                     |
| ----------------- | --------------------------------- | --------------- | ------------------------- |
| **lightId**       | `string`                          | ID of the light | [Defaults to `undefined`] |
| **lightLevelPut** | [LightLevelPut](LightLevelPut.md) |                 | [Optional]                |

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
