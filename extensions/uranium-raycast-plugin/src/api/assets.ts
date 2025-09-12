import { createRouter, createInstanceGateway } from "./apiClient";
import {
  FindUserAssetsRequestDto,
  FindUserAssetsResponseDto,
  PrepareNewFileRequestDto,
  PrepareNewFileResponseDto,
  CompleteUploadRequestDto,
  CompleteUploadResponseDto,
  StartMintingRequestDto,
  StartMintingResponseDto,
} from "./types";

export const assetsApiRouter = createRouter({
  list: (params: FindUserAssetsRequestDto, options?: any, controller?: any) => {
    const searchParams = new URLSearchParams();

    if (params.contractId) searchParams.append("contractId", params.contractId);
    if (params.pageSize) searchParams.append("pageSize", params.pageSize.toString());
    if (params.page) searchParams.append("page", params.page.toString());
    searchParams.append("sortBy", params.sortBy ?? "createdAt");
    searchParams.append("order", params.order ?? "desc");
    if (params.quickFilter) searchParams.append("quickFilter", params.quickFilter);

    return createInstanceGateway<FindUserAssetsResponseDto>(
      {
        method: "GET",
        url: `/assets/?${searchParams.toString()}`,
      },
      options,
      controller,
    );
  },

  prepareNewFile: (data: PrepareNewFileRequestDto, options?: any, controller?: any) => {
    return createInstanceGateway<PrepareNewFileResponseDto>(
      {
        method: "POST",
        url: "/assets/prepare-new-file",
        data,
      },
      options,
      controller,
    );
  },

  completeUpload: (data: CompleteUploadRequestDto, options?: any, controller?: any) => {
    return createInstanceGateway<CompleteUploadResponseDto>(
      {
        method: "POST",
        url: "/assets/complete-upload",
        data,
      },
      options,
      controller,
    );
  },

  startMinting: (data: StartMintingRequestDto, options?: any, controller?: any) => {
    return createInstanceGateway<StartMintingResponseDto>(
      {
        method: "POST",
        url: "/assets/start-minting",
        data,
      },
      options,
      controller,
    );
  },

  // TODO: Implement when API details are available
  getById: (_assetId: string, ..._args) => {
    throw new Error("TODO: Implement assets.getById when API specification is available");
  },
});
