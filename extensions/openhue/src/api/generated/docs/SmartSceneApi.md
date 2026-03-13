# SmartSceneApi

All URIs are relative to *https://192.168.1.0*

| Method                                                    | HTTP request                                       | Description              |
| --------------------------------------------------------- | -------------------------------------------------- | ------------------------ |
| [**createSmartScene**](SmartSceneApi.md#createsmartscene) | **POST** /clip/v2/resource/smart_scene             | Create a new smart scene |
| [**deleteSmartScene**](SmartSceneApi.md#deletesmartscene) | **DELETE** /clip/v2/resource/smart_scene/{sceneId} | Delete a smart scene     |
| [**getSmartScene**](SmartSceneApi.md#getsmartscene)       | **GET** /clip/v2/resource/smart_scene/{sceneId}    | Get a smart scene        |
| [**getSmartScenes**](SmartSceneApi.md#getsmartscenes)     | **GET** /clip/v2/resource/smart_scene              | List smart scenes        |
| [**updateSmartScene**](SmartSceneApi.md#updatesmartscene) | **PUT** /clip/v2/resource/smart_scene/{sceneId}    | Update a smart scene     |

## createSmartScene

> UpdateDevice200Response createSmartScene(smartScenePost)

Create a new smart scene

Creates a new smart scene

### Example

```ts
import {
  Configuration,
  SmartSceneApi,
} from '@openhue/client';
import type { CreateSmartSceneRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SmartSceneApi(config);

  const body = {
    // SmartScenePost (optional)
    smartScenePost: ...,
  } satisfies CreateSmartSceneRequest;

  try {
    const data = await api.createSmartScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name               | Type                                | Description | Notes      |
| ------------------ | ----------------------------------- | ----------- | ---------- |
| **smartScenePost** | [SmartScenePost](SmartScenePost.md) |             | [Optional] |

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

## deleteSmartScene

> UpdateDevice200Response deleteSmartScene(sceneId)

Delete a smart scene

Delete a single smart scene from its given &#x60;{sceneId}&#x60;

### Example

```ts
import { Configuration, SmartSceneApi } from "@openhue/client";
import type { DeleteSmartSceneRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SmartSceneApi(config);

  const body = {
    // string | ID of the smart scene.
    sceneId: sceneId_example,
  } satisfies DeleteSmartSceneRequest;

  try {
    const data = await api.deleteSmartScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name        | Type     | Description            | Notes                     |
| ----------- | -------- | ---------------------- | ------------------------- |
| **sceneId** | `string` | ID of the smart scene. | [Defaults to `undefined`] |

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

## getSmartScene

> GetSmartScenes200Response getSmartScene(sceneId)

Get a smart scene

Get details of a single smart scene from its given &#x60;{sceneId}&#x60;

### Example

```ts
import { Configuration, SmartSceneApi } from "@openhue/client";
import type { GetSmartSceneRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SmartSceneApi(config);

  const body = {
    // string | ID of the smart scene.
    sceneId: sceneId_example,
  } satisfies GetSmartSceneRequest;

  try {
    const data = await api.getSmartScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name        | Type     | Description            | Notes                     |
| ----------- | -------- | ---------------------- | ------------------------- |
| **sceneId** | `string` | ID of the smart scene. | [Defaults to `undefined`] |

### Return type

[**GetSmartScenes200Response**](GetSmartScenes200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Smart Scene Success Response | -                |
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

## getSmartScenes

> GetSmartScenes200Response getSmartScenes()

List smart scenes

List all available smart scenes

### Example

```ts
import { Configuration, SmartSceneApi } from "@openhue/client";
import type { GetSmartScenesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SmartSceneApi(config);

  try {
    const data = await api.getSmartScenes();
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

[**GetSmartScenes200Response**](GetSmartScenes200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description                  | Response headers |
| ----------- | ---------------------------- | ---------------- |
| **200**     | Smart Scene Success Response | -                |
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

## updateSmartScene

> UpdateDevice200Response updateSmartScene(sceneId, smartScenePut)

Update a smart scene

Update a single smart scene from its given &#x60;{sceneId}&#x60;

### Example

```ts
import {
  Configuration,
  SmartSceneApi,
} from '@openhue/client';
import type { UpdateSmartSceneRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SmartSceneApi(config);

  const body = {
    // string | ID of the scene.
    sceneId: sceneId_example,
    // SmartScenePut (optional)
    smartScenePut: ...,
  } satisfies UpdateSmartSceneRequest;

  try {
    const data = await api.updateSmartScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name              | Type                              | Description      | Notes                     |
| ----------------- | --------------------------------- | ---------------- | ------------------------- |
| **sceneId**       | `string`                          | ID of the scene. | [Defaults to `undefined`] |
| **smartScenePut** | [SmartScenePut](SmartScenePut.md) |                  | [Optional]                |

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
