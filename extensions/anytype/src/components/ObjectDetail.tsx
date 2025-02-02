import { useEffect } from "react";
import { format } from "date-fns";
import { Detail, showToast, Toast, Image, Icon } from "@raycast/api";
import { useObject } from "../hooks/useObject";
import { useExport } from "../hooks/useExport";
import ObjectActions from "./ObjectActions";
import type { Detail as ObjectDetail, Member } from "../helpers/schemas";

type ObjectDetailProps = {
  spaceId: string;
  objectId: string;
  title: string;
};

export default function ObjectDetail({ spaceId, objectId, title }: ObjectDetailProps) {
  const { object, objectError, isLoadingObject, mutateObject } = useObject(spaceId, objectId);
  const { objectExport, objectExportError, isLoadingObjectExport, mutateObjectExport } = useExport(
    spaceId,
    objectId,
    "markdown",
  );

  const details = object?.details || [];

  const createdDateDetail = details.find((detail) => detail.id === "created_date");
  const createdDate = createdDateDetail?.details?.created_date;

  const createdByDetail = details.find((detail) => detail.id === "created_by");
  const createdBy = createdByDetail?.details?.details as Member | undefined;

  const lastModifiedDateDetail = details.find((detail) => detail.id === "last_modified_date");
  const lastModifiedDate = lastModifiedDateDetail?.details?.last_modified_date;

  const lastModifiedByDetail = details.find((detail) => detail.id === "last_modified_by");
  const lastModifiedBy = lastModifiedByDetail?.details?.details as Member | undefined;

  const tags = details.flatMap((detail) => detail.details.tags || []);

  useEffect(() => {
    if (objectError) {
      showToast(Toast.Style.Failure, "Failed to fetch object", objectError.message);
    }
  }, [objectError]);

  useEffect(() => {
    if (objectExportError) {
      showToast(Toast.Style.Failure, "Failed to fetch object as markdown", objectExportError.message);
    }
  }, [objectExportError]);

  return (
    <Detail
      markdown={objectExport?.markdown}
      isLoading={isLoadingObject || isLoadingObjectExport}
      metadata={
        <Detail.Metadata>
          {lastModifiedDate ? (
            <Detail.Metadata.Label
              title="Last Modified Date"
              icon={Icon.Calendar}
              text={format(new Date(lastModifiedDate), "MMMM d, yyyy")}
            />
          ) : null}
          {lastModifiedBy ? (
            <Detail.Metadata.Label
              title="Last Modified By"
              text={lastModifiedBy.global_name || lastModifiedBy.name}
              icon={{ source: lastModifiedBy.icon || Icon.PersonCircle, mask: Image.Mask.Circle }}
            />
          ) : null}

          <Detail.Metadata.Separator />

          {createdDate ? (
            <Detail.Metadata.Label
              title="Created Date"
              icon={Icon.Calendar}
              text={format(new Date(createdDate), "MMMM d, yyyy")}
            />
          ) : null}
          {createdBy ? (
            <Detail.Metadata.Label
              title="Created By"
              text={createdBy.global_name || createdBy.name}
              icon={{ source: createdBy.icon || Icon.PersonCircle, mask: Image.Mask.Circle }}
            />
          ) : null}

          <Detail.Metadata.Separator />

          {tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tag.color} />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Tags" icon={Icon.Tag} text="No tags" />
          )}
          {}
        </Detail.Metadata>
      }
      actions={
        <ObjectActions
          spaceId={spaceId}
          objectId={objectId}
          title={title}
          mutateObject={mutateObject}
          mutateExport={mutateObjectExport}
          objectExport={objectExport}
          viewType="object"
        />
      }
    />
  );
}
