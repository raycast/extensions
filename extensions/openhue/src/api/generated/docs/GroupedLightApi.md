# GroupedLightApi

All URIs are relative to *https://192.168.1.0*

| Method                                                          | HTTP request                                             | Description          |
| --------------------------------------------------------------- | -------------------------------------------------------- | -------------------- |
| [**getGroupedLight**](GroupedLightApi.md#getgroupedlight)       | **GET** /clip/v2/resource/grouped_light/{groupedLightId} | Get grouped light    |
| [**getGroupedLights**](GroupedLightApi.md#getgroupedlights)     | **GET** /clip/v2/resource/grouped_light                  | List grouped lights  |
| [**updateGroupedLight**](GroupedLightApi.md#updategroupedlight) | **PUT** /clip/v2/resource/grouped_light/{groupedLightId} | Update grouped light |

## getGroupedLight

> GetGroupedLights200Response getGroupedLight(groupedLightId)

Get grouped light

Get details of a single grouped light from its given &#x60;{groupedLightId}&#x60;.

### Example

```ts
import { Configuration, GroupedLightApi } from "@openhue/client";
import type { GetGroupedLightRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new GroupedLightApi(config);

  const body = {
    // string | ID of the grouped light
    groupedLightId: groupedLightId_example,
  } satisfies GetGroupedLightRequest;

  try {
    const data = await api.getGroupedLight(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name               | Type     | Description             | Notes                     |
| ------------------ | -------- | ----------------------- | ------------------------- |
| **groupedLightId** | `string` | ID of the grouped light | [Defaults to `undefined`] |

### Return type

[**GetGroupedLights200Response**](GetGroupedLights200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                    | Response headers |
| ----------- | ------------------------------ | ---------------- |
| **200**     | Grouped Light Success Response | -                |
| **401**     | Unauthorized                   | -                |
| **403**     | Forbidden                      | -                |
| **404**     | Not Found                      | -                |
| **405**     | Method Not Allowed             | -                |
| **406**     | Not Acceptable                 | -                |
| **409**     | Conflict                       | -                |
| **429**     | Too Many Requests              | -                |
| **500**     | Internal Server Error          | -                |
| **503**     | Service Unavailable            | -                |
| **507**     | Insufficient Storage           | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## getGroupedLights

> GetGroupedLights200Response getGroupedLights()

List grouped lights

List all grouped lights

### Example

```ts
import { Configuration, GroupedLightApi } from "@openhue/client";
import type { GetGroupedLightsRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new GroupedLightApi(config);

  try {
    const data = await api.getGroupedLights();
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

[**GetGroupedLights200Response**](GetGroupedLights200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                    | Response headers |
| ----------- | ------------------------------ | ---------------- |
| **200**     | Grouped Light Success Response | -                |
| **401**     | Unauthorized                   | -                |
| **403**     | Forbidden                      | -                |
| **404**     | Not Found                      | -                |
| **405**     | Method Not Allowed             | -                |
| **406**     | Not Acceptable                 | -                |
| **409**     | Conflict                       | -                |
| **429**     | Too Many Requests              | -                |
| **500**     | Internal Server Error          | -                |
| **503**     | Service Unavailable            | -                |
| **507**     | Insufficient Storage           | -                |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

## updateGroupedLight

> UpdateDevice200Response updateGroupedLight(groupedLightId, groupedLightPut)

Update grouped light

Update a single grouped light from its given &#x60;{groupedLightId}&#x60;.

### Example

```ts
import { Configuration, GroupedLightApi } from "@openhue/client";
import type { UpdateGroupedLightRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new GroupedLightApi(config);

  const body = {
    // string | ID of the light
    groupedLightId: groupedLightId_example,
    // GroupedLightPut (optional)
    groupedLightPut: { on: { on: true } },
  } satisfies UpdateGroupedLightRequest;

  try {
    const data = await api.updateGroupedLight(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name                | Type                                  | Description     | Notes                     |
| ------------------- | ------------------------------------- | --------------- | ------------------------- |
| **groupedLightId**  | `string`                              | ID of the light | [Defaults to `undefined`] |
| **groupedLightPut** | [GroupedLightPut](GroupedLightPut.md) |                 | [Optional]                |

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
