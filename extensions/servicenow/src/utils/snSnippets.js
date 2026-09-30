/**
 * CREDIT: Snippets taken from the SN utils / arnoudkooi
 */

export function findReferences(tableName, sysId) {
  return `function findReferences(tableName, refRecordID) {
    var results = [];
    var refTable = new TableUtils(tableName).getTables();
    gs.include("j2js");
    refTable = j2js(refTable).join();

    var dict = new GlideRecord("sys_dictionary");
    dict
      .addQuery("reference", "IN", refTable)
      .addOrCondition("internal_type", "document_id")
      .addOrCondition("internal_type", "conditions");
    dict.addQuery("name", "DOES NOT CONTAIN", "var__m_");
    dict.addQuery("name", "DOES NOT CONTAIN", "ecc_");
    dict.addQuery("name", "DOES NOT CONTAIN", "ha_");
    dict.addQuery("name", "DOES NOT CONTAIN", "syslog");
    dict.addQuery("name", "DOES NOT CONTAIN", "sys_history");
    dict.addQuery("name", "DOES NOT CONTAIN", "_log");
    dict.addQuery("name", "DOES NOT CONTAIN", "text_search");
    dict.addQuery("name", "DOES NOT CONTAIN", "ts_");
    dict.addQuery("name", "DOES NOT CONTAIN", "sys_watermark");
    dict.addQuery("name", "DOES NOT CONTAIN", "sys_audit");
    dict.orderBy("name");
    dict.orderBy("element");
    dict.query();
    while (dict.next()) {
      var tblName = dict.name.toString();
      var gr = new GlideRecord("sys_table_rotation_schedule");
      gr.addQuery("name.name", "!=", tblName);
      gr.addQuery("table_name", tblName);
      gr.query();
      if (!gr.hasNext() && gs.tableExists(tblName)) {
        var operator = "=";
        var refType = dict.internal_type.toString();
        if (refType == "glide_list" || refType == "conditions") {
          operator = "LIKE";
        }

        var element = dict.element.toString();
        var rec = new GlideRecord(tblName);
        if (refType == "glide_list" || refType == "conditions") {
          rec.addQuery(element, "CONTAINS", refRecordID);
        } else {
          rec.addQuery(element, refRecordID);
        }
        rec.query();
        var count = rec.getRowCount();
        if (count > 0) {
          results.push({
            table: tblName,
            column: element,
            count: count,
            operator: operator
          });
        }
      }
    }

    var vVal = new GlideRecord("sys_variable_value");
    vVal.addQuery("value", "CONTAINS", refRecordID);
    vVal.query();
    var vCount = vVal.getRowCount();
    if (vCount > 0) {
      results.push({
        table: "sys_variable_value",
        column: "value",
        count: vCount,
        operator: "LIKE"
      });
    }

    gs.print("###" + JSON.stringify(results) + "###");
  }
  findReferences("${tableName}", "${sysId}");`;
}

export function findSysID(sys_id) {
  return `function findSysID(sys_id) {
    var commonTables = ["sys_metadata", "task", "cmdb_ci", "sys_user", "kb_knowledge"];
    var result;
    var i = 0;
    while (commonTables[i]) {
      result = findClass(commonTables[i], sys_id);
      i++;

      if (result) {
        gs.print("###" + result + "###");
        return;
      }
    }

    var forbiddenPrefixes = ["ts_", "sysx_", "v_", "sys_rollback_", "pa_"];
    var grDbObject = new GlideRecord("sys_db_object");
    grDbObject.addEncodedQuery(
      "super_class=NULL^sys_update_nameISNOTEMPTY^nameNOT LIKE00^nameNOT LIKE$^nameNOT INsys_metadata,task,cmdb_ci,sys_user,kb_knowledge,cmdb_ire_partial_payloads_index^scriptable_table=false^ORscriptable_tableISEMPTY",
    );
    grDbObject.query();
    while (grDbObject.next()) {
      var tableName = grDbObject.getValue("name");
      var hasForbiddenPrefix = forbiddenPrefixes.some(function (forbiddenPrefix) {
        return tableName.startsWith(forbiddenPrefix);
      });
      if (hasForbiddenPrefix) {
        continue;
      }
      result = findClass(tableName, sys_id);
      if (result) {
        gs.print("###" + result + "###");
        return;
      }
    }
    gs.print("###NOT_FOUND###");
    function findClass(table, sys_id) {
      try {
        var grTable = new GlideRecord(table);
        grTable.addQuery("sys_id", sys_id);
        // Order is important: setWorkflow must be before setLimit.
        grTable.setWorkflow(false);
        grTable.setLimit(1);
        grTable.queryNoDomain();
        grTable.query();
        if (grTable.hasNext()) {
          grTable.next();
          if (grTable.getUniqueValue() != sys_id) return false; //Some tables don't have sys_id
          return (
            grTable.getRecordClassName() + "^" + grTable.getClassDisplayValue() + " - " + grTable.getDisplayValue()
          );
        }
      } catch (err) {}
      return false;
    }
  }
  findSysID("${sys_id}");`;
}
