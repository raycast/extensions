import * as staticDatasets from "./schemas/index";

const platform_bucket =
  "gs://open-targets-pre-data-releases/22.11/output/etl/parquet";
const platform_ftp =
  "http://ftp.ebi.ac.uk/pub/databases/opentargets/platform/latest/output/etl/parquet/";
const genetics_bucket = "gs://genetics-portal-dev-data/22.09.0/outputs";
const genetics_ftp =
  "http://ftp.ebi.ac.uk/pub/databases/opentargets/genetics/latest/";
const genetics_dev_bucket =
  "gs://genetics_etl_python_playground/XX.XX/output/python_etl/parquet";
export interface Dataset {
  name: string;
  type: string;
  location: string;
  ftp?: string;
  schema_fields: Array<any>;
}

export const otDatasets: Dataset[] = [
  // Platform
  {
    name: "Association by datasource direct",
    type: "platform",
    location: `${platform_bucket}/associationByDatasourceDirect`,
    ftp: `${platform_ftp}/associationByDatasourceDirect/`,
    schema_fields: staticDatasets.associationByDatasourceDirect.fields,
  },
  {
    name: "Association by datasource indirect",
    type: "platform",
    location: `${platform_bucket}/associationByDatasourceIndirect`,
    ftp: `${platform_ftp}/associationByDatasourceIndirect/`,
    schema_fields: staticDatasets.associationByDatasourceIndirect.fields,
  },
  {
    name: "Association by datatype direct",
    type: "platform",
    location: `${platform_bucket}/associationByDatatypeDirect`,
    ftp: `${platform_ftp}/associationByDatatypeDirect/`,
    schema_fields: staticDatasets.associationByDatatypeDirect.fields,
  },
  {
    name: "Association by datatype indirect",
    type: "platform",
    location: `${platform_bucket}/associationByDatatypeIndirect`,
    ftp: `${platform_ftp}/associationByDatatypeIndirect/`,
    schema_fields: staticDatasets.associationByDatatypeIndirect.fields,
  },
  {
    name: "Association by overall direct",
    type: "platform",
    location: `${platform_bucket}/associationByOverallDirect`,
    ftp: `${platform_ftp}/associationByOverallDirect/`,
    schema_fields: staticDatasets.associationByOverallDirect.fields,
  },
  {
    name: "Association by overall indirect",
    type: "platform",
    location: `${platform_bucket}/associationByOverallIndirect`,
    ftp: `${platform_ftp}/associationByOverallIndirect/`,
    schema_fields: staticDatasets.associationByOverallIndirect.fields,
  },
  {
    name: "Baseline expression",
    type: "platform",
    location: `${platform_bucket}/baselineExpression`,
    ftp: `${platform_ftp}/baselineExpression/`,
    schema_fields: staticDatasets.baselineExpression.fields,
  },
  {
    name: "Diseases",
    type: "platform",
    location: `${platform_bucket}/diseases`,
    ftp: `${platform_ftp}/diseases/`,
    schema_fields: staticDatasets.diseases.fields,
  },
  {
    name: "Disease to phenotype",
    type: "platform",
    location: `${platform_bucket}/diseaseToPhenotype`,
    ftp: `${platform_ftp}/diseaseToPhenotype/`,
    schema_fields: staticDatasets.diseaseToPhenotype.fields,
  },
  {
    name: "Drug warnings",
    type: "platform",
    location: `${platform_bucket}/drugWarnings`,
    ftp: `${platform_ftp}/drugWarnings/`,
    schema_fields: staticDatasets.drugWarnings.fields,
  },
  {
    name: "Evidence",
    type: "platform",
    location: `${platform_bucket}/evidence`,
    ftp: `${platform_ftp}/evidence/`,
    schema_fields: staticDatasets.evidence.fields,
  },
  {
    name: "GO",
    type: "platform",
    location: `${platform_bucket}/go`,
    ftp: `${platform_ftp}/go/`,
    schema_fields: staticDatasets.go.fields,
  },
  {
    name: "HPO",
    type: "platform",
    location: `${platform_bucket}/hpo`,
    ftp: `${platform_ftp}/hpo/`,
    schema_fields: staticDatasets.hpo.fields,
  },
  {
    name: "Indication",
    type: "platform",
    location: `${platform_bucket}/indication`,
    ftp: `${platform_ftp}/indication/`,
    schema_fields: staticDatasets.indication.fields,
  },
  {
    name: "Interaction",
    type: "platform",
    location: `${platform_bucket}/interaction`,
    ftp: `${platform_ftp}/interaction/`,
    schema_fields: staticDatasets.interaction.fields,
  },
  {
    name: "Molecule",
    type: "platform",
    location: `${platform_bucket}/molecule`,
    schema_fields: staticDatasets.molecule.fields,
  },
  {
    name: "Mouse phenotypes",
    type: "platform",
    location: `${platform_bucket}/mousePhenotypes`,
    ftp: `${platform_ftp}/mousePhenotypes/`,
    schema_fields: staticDatasets.mousePhenotypes.fields,
  },
  {
    name: "Reactome",
    type: "platform",
    location: `${platform_bucket}/reactome`,
    ftp: `${platform_ftp}/reactome/`,
    schema_fields: staticDatasets.reactome.fields,
  },
  {
    name: "Targets",
    type: "platform",
    location: `${platform_bucket}/targets`,
    ftp: `${platform_ftp}/targets/`,
    schema_fields: staticDatasets.targets.fields,
  },
  // Genetics
  {
    name: "Disease to variant to gene (scored)",
    type: "genetics",
    location: `${genetics_bucket}/d2v2g_scored`,
    ftp: `${genetics_ftp}/d2v2g_scored/`,
    schema_fields: staticDatasets.d2v2g_scored.fields,
  },
  {
    name: "Disease to variant to gene",
    type: "genetics",
    location: `${genetics_bucket}/d2v2g`,
    ftp: `${genetics_ftp}/d2v2g/`,
    schema_fields: staticDatasets.d2v2g.fields,
  },
  {
    name: "Genes index",
    type: "genetics",
    location: `${genetics_bucket}/lut/genes-index`,
    ftp: `${genetics_ftp}/lut/genes-index/`,
    schema_fields: staticDatasets.genes_index.fields,
  },
  {
    name: "Locus to gene",
    type: "genetics",
    location: `${genetics_bucket}/l2g`,
    ftp: `${genetics_ftp}/l2g/`,
    schema_fields: staticDatasets.l2g.fields,
  },
  {
    name: "Manhattan",
    type: "genetics",
    location: `${genetics_bucket}/manhattan`,
    ftp: `${genetics_ftp}/manhattan/`,
    schema_fields: staticDatasets.manhattan.fields,
  },
  {
    name: "Overlap index",
    type: "genetics",
    location: `${genetics_bucket}/lut/overlap-index`,
    ftp: `${genetics_ftp}/lut/overlap-index/`,
    schema_fields: staticDatasets.overlap_index.fields,
  },
  {
    name: "Study index",
    type: "genetics",
    location: `${genetics_bucket}/lut/study-index`,
    ftp: `${genetics_ftp}/lut/study-index/`,
    schema_fields: staticDatasets.studies.fields,
  },
  {
    name: "Colocalisation",
    type: "genetics",
    location: `${genetics_bucket}/v2d_coloc`,
    ftp: `${genetics_ftp}/v2d_coloc/`,
    schema_fields: staticDatasets.v2d_coloc.fields,
  },
  {
    name: "Credible sets",
    type: "genetics",
    location: `${genetics_bucket}/v2d_credset`,
    ftp: `${genetics_ftp}/v2d_credset/`,
    schema_fields: staticDatasets.v2d_credset.fields,
  },
  {
    name: "Variant to disease",
    type: "genetics",
    location: `${genetics_bucket}/v2d`,
    ftp: `${genetics_ftp}/v2d/`,
    schema_fields: staticDatasets.v2d.fields,
  },
  {
    name: "Variant to gene",
    type: "genetics",
    location: `${genetics_bucket}/v2g`,
    ftp: `${genetics_ftp}/v2g/`,
    schema_fields: staticDatasets.v2g.fields,
  },
  {
    name: "Variant index",
    type: "genetics",
    location: `${genetics_bucket}/variant-index`,
    ftp: `${genetics_ftp}/lut/variant-index/`,
    schema_fields: staticDatasets.variant_index.fields,
  },
  // Genetics (dev)
  {
    name: "Study index (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/study-index`,
    schema_fields: staticDatasets.studies_dev.fields,
  },
  {
    name: "Colocalisation (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/colocalisation`,
    schema_fields: staticDatasets.colocalisation_dev.fields,
  },
  {
    name: "Study locus (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/study-locus`,
    schema_fields: staticDatasets.study_locus_dev.fields,
  },
  {
    name: "Study locus overlap (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/study-locus-overlap`,
    schema_fields: staticDatasets.study_locus_overlap_dev.fields,
  },
  {
    name: "Targets (dev)",
    type: "genetics-dev",
    location: `gs://genetics_etl_python_playground/input/v2g_input/targets_correct_tss`,
    schema_fields: staticDatasets.targets_dev.fields,
  },
  {
    name: "Variant to gene (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/variant-to-gene`,
    schema_fields: staticDatasets.v2g_dev.fields,
  },
  {
    name: "Variant annotation (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/variant-annotation`,
    schema_fields: staticDatasets.variant_annotation_dev.fields,
  },
  {
    name: "Variant index (dev)",
    type: "genetics-dev",
    location: `${genetics_dev_bucket}/variant-index`,
    schema_fields: staticDatasets.variant_index_dev.fields,
  },
];
