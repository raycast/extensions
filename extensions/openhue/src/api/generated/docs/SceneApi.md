# SceneApi

All URIs are relative to *https://192.168.1.0*

| Method                                     | HTTP request                                 | Description        |
| ------------------------------------------ | -------------------------------------------- | ------------------ |
| [**createScene**](SceneApi.md#createscene) | **POST** /clip/v2/resource/scene             | Create a new scene |
| [**deleteScene**](SceneApi.md#deletescene) | **DELETE** /clip/v2/resource/scene/{sceneId} | Delete a scene     |
| [**getScene**](SceneApi.md#getscene)       | **GET** /clip/v2/resource/scene/{sceneId}    | Get a scene        |
| [**getScenes**](SceneApi.md#getscenes)     | **GET** /clip/v2/resource/scene              | List scenes        |
| [**updateScene**](SceneApi.md#updatescene) | **PUT** /clip/v2/resource/scene/{sceneId}    | Update a scene     |

## createScene

> UpdateDevice200Response createScene(scenePost)

Create a new scene

Creates a new scene

### Example

```ts
import {
  Configuration,
  SceneApi,
} from '@openhue/client';
import type { CreateSceneRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SceneApi(config);

  const body = {
    // ScenePost (optional)
    scenePost: ...,
  } satisfies CreateSceneRequest;

  try {
    const data = await api.createScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name          | Type                      | Description | Notes      |
| ------------- | ------------------------- | ----------- | ---------- |
| **scenePost** | [ScenePost](ScenePost.md) |             | [Optional] |

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

## deleteScene

> UpdateDevice200Response deleteScene(sceneId)

Delete a scene

Delete a single scene from its given &#x60;{sceneId}&#x60;

### Example

```ts
import { Configuration, SceneApi } from "@openhue/client";
import type { DeleteSceneRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SceneApi(config);

  const body = {
    // string | ID of the scene.
    sceneId: sceneId_example,
  } satisfies DeleteSceneRequest;

  try {
    const data = await api.deleteScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name        | Type     | Description      | Notes                     |
| ----------- | -------- | ---------------- | ------------------------- |
| **sceneId** | `string` | ID of the scene. | [Defaults to `undefined`] |

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

## getScene

> GetScenes200Response getScene(sceneId)

Get a scene

Get details of a single scene from its given &#x60;{sceneId}&#x60;

### Example

```ts
import { Configuration, SceneApi } from "@openhue/client";
import type { GetSceneRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SceneApi(config);

  const body = {
    // string | ID of the scene.
    sceneId: sceneId_example,
  } satisfies GetSceneRequest;

  try {
    const data = await api.getScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name        | Type     | Description      | Notes                     |
| ----------- | -------- | ---------------- | ------------------------- |
| **sceneId** | `string` | ID of the scene. | [Defaults to `undefined`] |

### Return type

[**GetScenes200Response**](GetScenes200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description            | Response headers |
| ----------- | ---------------------- | ---------------- |
| **200**     | Scene Success Response | -                |
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

## getScenes

> GetScenes200Response getScenes()

List scenes

List all available scenes

### Example

```ts
import { Configuration, SceneApi } from "@openhue/client";
import type { GetScenesRequest } from "@openhue/client";

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SceneApi(config);

  try {
    const data = await api.getScenes();
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

[**GetScenes200Response**](GetScenes200Response.md)

### Authorization

[HueApplicationKey](../README.md#HueApplicationKey)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

### HTTP response details

| Status code | Description            | Response headers |
| ----------- | ---------------------- | ---------------- |
| **200**     | Scene Success Response | -                |
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

## updateScene

> UpdateDevice200Response updateScene(sceneId, scenePut)

Update a scene

Update a single scene from its given &#x60;{sceneId}&#x60;

### Example

```ts
import {
  Configuration,
  SceneApi,
} from '@openhue/client';
import type { UpdateSceneRequest } from '@openhue/client';

async function example() {
  console.log("🚀 Testing @openhue/client SDK...");
  const config = new Configuration({
    // To configure API key authorization: HueApplicationKey
    apiKey: "YOUR API KEY",
  });
  const api = new SceneApi(config);

  const body = {
    // string | ID of the scene.
    sceneId: sceneId_example,
    // ScenePut (optional)
    scenePut: ...,
  } satisfies UpdateSceneRequest;

  try {
    const data = await api.updateScene(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

| Name         | Type                    | Description      | Notes                     |
| ------------ | ----------------------- | ---------------- | ------------------------- |
| **sceneId**  | `string`                | ID of the scene. | [Defaults to `undefined`] |
| **scenePut** | [ScenePut](ScenePut.md) |                  | [Optional]                |

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
