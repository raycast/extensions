import {
  studies_dev,
  colocalisation_dev,
  study_locus_dev,
  study_locus_overlap_dev,
  targets_dev,
  v2g_dev,
  variant_annotation_dev,
  variant_index_dev,
  associationByDatasourceDirect,
  associationByDatasourceIndirect,
  associationByDatatypeDirect,
  associationByDatatypeIndirect,
  associationByOverallDirect,
  associationByOverallIndirect,
  baselineExpression,
  diseases,
  diseaseToPhenotype,
  drugWarnings,
  evidence,
  go,
  hpo,
  indication,
  interaction,
  molecule,
  mousePhenotypes,
  reactome,
  targets,
  d2v2g_scored,
  d2v2g,
  genes_index,
  l2g,
  manhattan,
  overlap_index,
  studies,
  v2d_coloc,
  v2d_credset,
  v2d,
  v2g,
  variant_index,
} from "./schemas/index";

const platform_bucket =
  "gs://open-targets-pre-data-releases/22.11/output/etl/parquet";
const genetics_bucket = "gs://genetics-portal-dev-data/22.09.0/outputs";
const genetics_dev_bucket =
  "gs://genetics_etl_python_playground/XX.XX/output/python_etl/parquet";

export interface Dataset {
  name: string;
  type: string;
  location: string;
  schema_fields: Array<any>;
}

export const otDatasets: Dataset[] = [
  {
    name: "Study index (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/study-index`,
    schema_fields: studies_dev.fields,
  },
  {
    name: "Colocalisation (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/colocalisation`,
    schema_fields: colocalisation_dev.fields,
  },
  {
    name: "Study locus (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/study-locus`,
    schema_fields: study_locus_dev.fields,
  },
  {
    name: "Study locus overlap (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/study-locus-overlap`,
    schema_fields: study_locus_overlap_dev.fields,
  },
  {
    name: "Targets (dev)",
    type: "genetics-dev",
    location: `gs://genetics_etl_python_playground/input/v2g_input/targets_correct_tss`,
    schema_fields: targets_dev.fields,
  },
  {
    name: "Variant to gene (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/variant-to-gene`,
    schema_fields: v2g_dev.fields,
  },
  {
    name: "Variant annotation (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/variant-annotation`,
    schema_fields: variant_annotation_dev.fields,
  },
  {
    name: "Variant index (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/variant-index`,
    schema_fields: variant_index_dev.fields,
  },
  // Platform
  {
    name: "Association by datasource direct",
    type: "platform",
    location: `${platform_bucket}/associationByDatasourceDirect`,
    schema_fields: associationByDatasourceDirect.fields,
  },
  {
    name: "Association by datasource indirect",
    type: "platform",
    location: `${platform_bucket}/associationByDatasourceIndirect`,
    schema_fields: associationByDatasourceIndirect.fields,
  },
  {
    name: "Association by datatype direct",
    type: "platform",
    location: `${platform_bucket}/associationByDatatypeDirect`,
    schema_fields: associationByDatatypeDirect.fields,
  },
  {
    name: "Association by datatype indirect",
    type: "platform",
    location: `${platform_bucket}/associationByDatatypeIndirect`,
    schema_fields: associationByDatatypeIndirect.fields,
  },
  {
    name: "Association by overall direct",
    type: "platform",
    location: `${platform_bucket}/associationByOverallDirect`,
    schema_fields: associationByOverallDirect.fields,
  },
  {
    name: "Association by overall indirect",
    type: "platform",
    location: `${platform_bucket}/associationByOverallIndirect`,
    schema_fields: associationByOverallIndirect.fields,
  },
  {
    name: "Baseline expression",
    type: "platform",
    location: `${platform_bucket}/baselineExpression`,
    schema_fields: baselineExpression.fields,
  },
  {
    name: "Diseases",
    type: "platform",
    location: `${platform_bucket}/diseases`,
    schema_fields: diseases.fields,
  },
  {
    name: "Disease to phenotype",
    type: "platform",
    location: `${platform_bucket}/diseaseToPhenotype`,
    schema_fields: diseaseToPhenotype.fields,
  },
  {
    name: "Drug warnings",
    type: "platform",
    location: `${platform_bucket}/drugWarnings`,
    schema_fields: drugWarnings.fields,
  },
  {
    name: "Evidence",
    type: "platform",
    location: `${platform_bucket}/evidence`,
    schema_fields: evidence.fields,
  },
  {
    name: "GO",
    type: "platform",
    location: `${platform_bucket}/go`,
    schema_fields: go.fields,
  },
  {
    name: "HPO",
    type: "platform",
    location: `${platform_bucket}/hpo`,
    schema_fields: hpo.fields,
  },
  {
    name: "Indication",
    type: "platform",
    location: `${platform_bucket}/indication`,
    schema_fields: indication.fields,
  },
  {
    name: "Interaction",
    type: "platform",
    location: `${platform_bucket}/interaction`,
    schema_fields: interaction.fields,
  },
  {
    name: "Molecule",
    type: "platform",
    location: `${platform_bucket}/molecule`,
    schema_fields: molecule.fields,
  },
  {
    name: "Mouse phenotypes",
    type: "platform",
    location: `${platform_bucket}/mousePhenotypes`,
    schema_fields: mousePhenotypes.fields,
  },
  {
    name: "Reactome",
    type: "platform",
    location: `${platform_bucket}/reactome`,
    schema_fields: reactome.fields,
  },
  {
    name: "Targets",
    type: "platform",
    location: `${platform_bucket}/targets`,
    schema_fields: targets.fields,
  },
  // Genetics
  {
    name: "Disease to variant to gene (scored)",
    type: "genetics",
    location: `${genetics_bucket}/d2v2g_scored`,
    schema_fields: d2v2g_scored.fields,
  },
  {
    name: "Disease to variant to gene",
    type: "genetics",
    location: `${genetics_bucket}/d2v2g`,
    schema_fields: d2v2g.fields,
  },
  {
    name: "Genes index",
    type: "genetics",
    location: `${genetics_bucket}/lut/genes-index`,
    schema_fields: genes_index.fields,
  },
  {
    name: "Locus to gene",
    type: "genetics",
    location: `${genetics_bucket}/l2g`,
    schema_fields: l2g.fields,
  },
  {
    name: "Manhattan",
    type: "genetics",
    location: `${genetics_bucket}/manhattan`,
    schema_fields: manhattan.fields,
  },
  {
    name: "Overlap index",
    type: "genetics",
    location: `${genetics_bucket}/lut/overlap-index`,
    schema_fields: overlap_index.fields,
  },
  {
    name: "Study index",
    type: "genetics",
    location: `${genetics_bucket}/lut/study-index`,
    schema_fields: studies.fields,
  },
  {
    name: "Colocalisation",
    type: "genetics",
    location: `${genetics_bucket}/v2d_coloc`,
    schema_fields: v2d_coloc.fields,
  },
  {
    name: "Credible sets",
    type: "genetics",
    location: `${genetics_bucket}/v2d_credset`,
    schema_fields: v2d_credset.fields,
  },
  {
    name: "Variant to disease",
    type: "genetics",
    location: `${genetics_bucket}/v2d`,
    schema_fields: v2d.fields,
  },
  {
    name: "Variant to gene",
    type: "genetics",
    location: `${genetics_bucket}/v2g`,
    schema_fields: v2g.fields,
  },
  {
    name: "Variant index",
    type: "genetics",
    location: `${genetics_bucket}/variant-index`,
    schema_fields: variant_index.fields,
  },
];
