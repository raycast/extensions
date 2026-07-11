import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "./api";
import { useAccount } from "./hooks/useAccount";
import { useContractsQuery } from "./hooks/useContracts";
import { createSmartContractSchema } from "./utils";
import { QueryWrapper } from "./providers/QueryProvider";

type FormData = z.infer<typeof createSmartContractSchema>;

function ContractsCreateContent() {
  const queryClient = useQueryClient();
  const { smartContractsLimit, userId } = useAccount();
  const { data: contractsData } = useContractsQuery();

  const methods = useForm<FormData>({
    resolver: zodResolver(createSmartContractSchema),
    defaultValues: {
      name: "",
      symbol: "",
      type: "ERC721",
    },
    mode: "all",
  });

  // Count personal contracts (same logic as web-app)
  const personalContracts =
    contractsData?.contracts?.filter((contract) => contract.type !== "EXTERNAL" && userId === contract.userId) || [];

  const canCreateMore = personalContracts.length < smartContractsLimit;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.contracts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Collection created successfully!",
      });
      popToRoot();
    },
    onError: (error: unknown) => {
      console.error("Create collection error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          (error as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode ||
          "Failed to create collection",
      });
    },
  });

  const onSubmit = async () => {
    // Validate form manually
    const isValid = await methods.trigger();
    if (!isValid) {
      return;
    }

    if (!canCreateMore) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Limit Reached",
        message: `You have reached the limit of ${smartContractsLimit} collections`,
      });
      return;
    }

    const formData = methods.getValues();
    createMutation.mutate(formData);
  };

  const {
    control,
    formState: { errors },
  } = methods;

  return (
    <Form
      isLoading={createMutation.isPending}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Collection" onSubmit={onSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Form.TextField
            id="name"
            title="Collection Name"
            placeholder="Enter collection name..."
            error={errors.name?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      <Controller
        name="symbol"
        control={control}
        render={({ field }) => (
          <Form.TextField
            id="symbol"
            title="Symbol"
            placeholder="Enter collection symbol..."
            error={errors.symbol?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <Form.Dropdown
            id="type"
            title="Collection Type"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          >
            <Form.Dropdown.Item value="ERC721" title="ERC-721 (NFT)" />
            <Form.Dropdown.Item value="ERC1155" title="ERC-1155 (Multi-Token)" />
          </Form.Dropdown>
        )}
      />

      <Form.Separator />

      <Form.Description
        text={`Personal Collections: ${personalContracts.length}/${smartContractsLimit}${!canCreateMore ? " (Limit Reached)" : ""}`}
      />
    </Form>
  );
}

export default function ContractsCreate() {
  return (
    <QueryWrapper>
      <ContractsCreateContent />
    </QueryWrapper>
  );
}
